import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Keyboard,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography } from '../theme/tokens';
import {
  createConversation,
  deleteConversation,
  getChatStarterSuggestions,
  getConversation,
  getProductDetail,
  listConversations,
  sendChatMessage,
  updateConversation,
  type ConversationSummary,
  type StoredChatMessage,
} from '../services/api';
import { useAuth } from '../services/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: any[];
  suggestions?: string[] | null;
  fallback?: any;
}

interface PendingChatRequest {
  question: string;
  userMessageId: string;
  createdAt: number;
  attempts: number;
}

const PENDING_CHAT_KEY = '@nutrilens/pending-chat-request';
const PENDING_CHAT_TTL_MS = 15 * 60 * 1000;
const MAX_PENDING_CHAT_ATTEMPTS = 3;
const FALLBACK_STARTER_SUGGESTIONS = [
  'Que productos tengo con menos azucar?',
  'Cuales son aptos para celiacos?',
  'Que puedo comer si evito lactosa?',
  'Explicame los sellos de mis productos',
];

export default function ChatScreen({ route, navigation }: any) {
  const { isAuthenticated } = useAuth();
  const productData = route?.params?.productData;
  const initialProduct = productData?.product?.producto || productData?.product?.name;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [starterSuggestions, setStarterSuggestions] = useState<string[]>(
    FALLBACK_STARTER_SUGGESTIONS,
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const messagesRef = useRef<Message[]>([]);
  const isLoadingRef = useRef(false);
  const typingAnim1 = useRef(new Animated.Value(0.35)).current;
  const typingAnim2 = useRef(new Animated.Value(0.35)).current;
  const typingAnim3 = useRef(new Animated.Value(0.35)).current;

  const setChatLoading = (value: boolean) => {
    isLoadingRef.current = value;
    setIsLoading(value);
  };

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    resetInitialMessages();
  }, [initialProduct]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshConversations();
    refreshStarterSuggestions();
  }, [isAuthenticated]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const offset = Platform.OS === 'ios' ? 64 : 0;
      setKeyboardInset(Math.max(event.endCoordinates.height - offset, 0));
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      typingAnim1.setValue(0.35);
      typingAnim2.setValue(0.35);
      typingAnim3.setValue(0.35);
      return;
    }

    const createDotLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.35, duration: 280, useNativeDriver: true }),
        ]),
      );

    const loops = [
      createDotLoop(typingAnim1, 0),
      createDotLoop(typingAnim2, 130),
      createDotLoop(typingAnim3, 260),
    ];

    loops.forEach((loop) => loop.start());
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));

    return () => loops.forEach((loop) => loop.stop());
  }, [isLoading, typingAnim1, typingAnim2, typingAnim3]);

  useEffect(() => {
    recoverPendingChat();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        recoverPendingChat();
      }
    });

    return () => subscription.remove();
  }, []);

  const submitQuestion = async (question: string) => {
    const text = question.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(text);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.answer,
        products: response.products || [],
        suggestions: response.suggestions,
        fallback: response.fallback,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Hubo un error de conexión. Por favor intentá nuevamente.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const resilientSubmitQuestion = (question: string) => {
    const text = question.trim();
    if (!text || isLoadingRef.current) return;

    const userMessageId = createMessageId();
    const userMsg: Message = { id: userMessageId, role: 'user', text };
    setMessages((prev) => appendMessageIfMissing(prev, userMsg));
    setInputText('');
    runChatRequest({ question: text, userMessageId, attempts: 0, mode: 'new' });
  };

  const runChatRequest = async ({
    question,
    userMessageId,
    attempts,
    mode,
  }: {
    question: string;
    userMessageId: string;
    attempts: number;
    mode: 'new' | 'retry';
  }) => {
    if (isLoadingRef.current) return;

    const pending: PendingChatRequest = {
      question,
      userMessageId,
      createdAt: Date.now(),
      attempts,
    };

    await AsyncStorage.setItem(PENDING_CHAT_KEY, JSON.stringify(pending));
    setChatLoading(true);

    try {
      const response = await sendChatMessage(question);

      const botMsg: Message = {
        id: createMessageId(),
        role: 'assistant',
        text: response.answer,
        products: response.products || [],
        suggestions: response.suggestions,
        fallback: response.fallback,
      };

      const nextMessages = appendMessageIfMissing(messagesRef.current, botMsg);
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      await persistConversation(nextMessages);
      await AsyncStorage.removeItem(PENDING_CHAT_KEY);
    } catch (error) {
      const nextAttempts = attempts + 1;
      if (nextAttempts >= MAX_PENDING_CHAT_ATTEMPTS) {
        await AsyncStorage.removeItem(PENDING_CHAT_KEY);
      } else {
        await AsyncStorage.setItem(
          PENDING_CHAT_KEY,
          JSON.stringify({ ...pending, attempts: nextAttempts }),
        );
      }

      const errorMsg: Message = {
        id: createMessageId(),
        role: 'assistant',
        text:
          mode === 'retry' || nextAttempts >= MAX_PENDING_CHAT_ATTEMPTS
            ? 'No pude completar la respuesta. Revisa tu conexion e intenta de nuevo.'
            : 'Se interrumpio la conexion. Si volves a la app, intento recuperar la respuesta.',
      };
      setMessages((prev) => appendMessageIfMissing(prev, errorMsg));
    } finally {
      setChatLoading(false);
    }
  };

  const recoverPendingChat = async () => {
    if (isLoadingRef.current) return;

    const rawPending = await AsyncStorage.getItem(PENDING_CHAT_KEY);
    if (!rawPending) return;

    try {
      const pending = JSON.parse(rawPending) as PendingChatRequest;
      if (!pending.question || !pending.userMessageId || !pending.createdAt) {
        await AsyncStorage.removeItem(PENDING_CHAT_KEY);
        return;
      }

      if (Date.now() - pending.createdAt > PENDING_CHAT_TTL_MS) {
        await AsyncStorage.removeItem(PENDING_CHAT_KEY);
        setMessages((prev) =>
          appendMessageIfMissing(prev, {
            id: createMessageId(),
            role: 'assistant',
            text: 'La consulta anterior quedo demasiado vieja. Mandamela de nuevo y la reviso.',
          }),
        );
        return;
      }

      setMessages((prev) =>
        appendMessageIfMissing(prev, {
          id: pending.userMessageId,
          role: 'user',
          text: pending.question,
        }),
      );

      runChatRequest({
        question: pending.question,
        userMessageId: pending.userMessageId,
        attempts: pending.attempts || 0,
        mode: 'retry',
      });
    } catch (error) {
      await AsyncStorage.removeItem(PENDING_CHAT_KEY);
    }
  };

  const handleSend = () => resilientSubmitQuestion(inputText);

  const refreshConversations = async () => {
    try {
      setConversations(await listConversations());
    } catch {
      setConversations([]);
    }
  };

  const refreshStarterSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await getChatStarterSuggestions();
      setStarterSuggestions(
        suggestions && suggestions.length >= 2 ? suggestions : FALLBACK_STARTER_SUGGESTIONS,
      );
    } catch {
      setStarterSuggestions(FALLBACK_STARTER_SUGGESTIONS);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const persistConversation = async (nextMessages: Message[]) => {
    if (!isAuthenticated) return;
    const stored = nextMessages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map(toStoredMessage);
    if (stored.filter((message) => message.role === 'user').length === 0) return;

    try {
      if (activeConversationId) {
        await updateConversation(activeConversationId, stored);
      } else {
        const created = await createConversation(stored);
        setActiveConversationId(created.id);
      }
      await refreshConversations();
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const openConversation = async (id: string) => {
    try {
      const conversation = await getConversation(id);
      setActiveConversationId(id);
      setIsHistoryOpen(false);
      const restored = conversation.messages.map((message, index) => ({
        id: `${conversation.id}-${index}`,
        role: message.role,
        text: message.text,
        products: message.products,
        fallback: message.fallback,
      }));
      messagesRef.current = restored;
      setMessages(restored);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo abrir la conversación.');
    }
  };

  const removeConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        resetInitialMessages();
      }
      await refreshConversations();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo eliminar la conversación.');
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setIsHistoryOpen(false);
    resetInitialMessages();
  };

  const resetInitialMessages = () => {
    const initial = initialProduct
      ? {
          id: createMessageId(),
          role: 'assistant' as const,
          text: `Hola! Veo que acabas de analizar **${initialProduct}**. Que te gustaria saber sobre este u otros productos?`,
        }
      : {
          id: createMessageId(),
          role: 'assistant' as const,
          text: 'Hola! Soy tu asistente nutricional. Preguntame sobre tus productos o elegi una sugerencia para empezar.',
        };
    messagesRef.current = [initial];
    setMessages([initial]);
  };
  const openProduct = async (product: any) => {
    if (!navigation) return;
    try {
      const detail = await getProductDetail(product.id);
      navigation.navigate('Result', {
        data: mapDetailToResultData(detail),
        photoUri: detail.imagenUrl || undefined,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo abrir el producto.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageWrapper,
          isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant,
        ]}
      >
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
        )}
        <View style={styles.messageContent}>
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant,
            ]}
          >
            {isUser ? (
              <Text style={[styles.messageText, styles.messageTextUser]}>{item.text}</Text>
            ) : (
              <MarkdownText text={item.text} />
            )}
          </View>

          {!isUser && item.products && item.products.length > 0 && (
            <View style={styles.productList} testID="chat-products-list">
              {item.products.map((product, index) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productChip}
                  onPress={() => openProduct(product)}
                  activeOpacity={0.75}
                >
                  <View style={styles.productRank}>
                    <Text style={styles.productRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.nombre}
                    </Text>
                    <Text style={styles.productMeta}>
                      {product.categoria} · Riesgo {translateRisk(product.riesgo)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!isUser && item.fallback?.showAnalyzeCta && (
            <TouchableOpacity
              style={styles.analyzeCta}
              onPress={() => navigation?.navigate('Analizar')}
              activeOpacity={0.75}
            >
              <Ionicons name="scan" size={18} color="#fff" />
              <Text style={styles.analyzeCtaText}>Analizar nuevo producto</Text>
            </TouchableOpacity>
          )}

          {!isUser && item.suggestions && item.suggestions.length > 0 && (
            <View style={styles.suggestionsRow}>
              {item.suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.suggestionPill}
                  onPress={() => resilientSubmitQuestion(suggestion)}
                  disabled={isLoading}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'android' ? 'height' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.historyButton, isHistoryOpen && styles.headerButtonActive]}
            onPress={() => setIsHistoryOpen((value) => !value)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isHistoryOpen ? 'chatbubbles' : 'chatbubbles-outline'}
              size={18}
              color={isHistoryOpen ? colors.primaryStrong : colors.textMuted}
            />
            {conversations.length > 0 && (
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{Math.min(conversations.length, 9)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Asistente IA</Text>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={startNewConversation}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={18} color={colors.primaryStrong} />
          </TouchableOpacity>
        </View>

        {isHistoryOpen && (
          <View style={styles.historyPanel}>
            <View style={styles.historyPanelHeader}>
              <View>
                <Text style={styles.historyPanelTitle}>Conversaciones</Text>
                <Text style={styles.historyPanelSubtitle}>
                  {conversations.length > 0
                    ? 'Abrí o eliminá chats anteriores'
                    : 'Tus chats guardados van a aparecer acá'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.historyCloseButton}
                onPress={() => setIsHistoryOpen(false)}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {conversations.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textMuted} />
                <Text style={styles.historyEmptyText}>
                  Cuando hagas una pregunta y NutriLens responda, el chat se guarda solo.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {conversations.slice(0, 6).map((item) => (
                  <View key={item.id} style={styles.historyRow}>
                    <TouchableOpacity
                      style={styles.historyRowMain}
                      onPress={() => openConversation(item.id)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.historyRowIcon,
                          activeConversationId === item.id && styles.historyRowIconActive,
                        ]}
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={16}
                          color={
                            activeConversationId === item.id
                              ? colors.primaryStrong
                              : colors.textMuted
                          }
                        />
                      </View>
                      <View style={styles.historyRowText}>
                        <Text style={styles.historyRowTitle} numberOfLines={1}>
                          {item.title || 'Consulta sin título'}
                        </Text>
                        <Text style={styles.historyRowPreview} numberOfLines={1}>
                          {item.lastMessage || `${item.messageCount} mensajes`}
                        </Text>
                      </View>
                      <Text style={styles.historyRowDate}>
                        {formatConversationDate(item.updatedAt)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.historyDeleteButton}
                      onPress={() => removeConversation(item.id)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.historyNewButton}
              onPress={startNewConversation}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={18} color={colors.primaryStrong} />
              <Text style={styles.historyNewButtonText}>Nuevo chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isHistoryOpen && conversations.length > 0 && (
          <View style={styles.conversationRail}>
            <FlatList
              horizontal
              data={conversations}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.conversationRailContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.conversationChip,
                    activeConversationId === item.id && styles.conversationChipActive,
                  ]}
                  onPress={() => openConversation(item.id)}
                  onLongPress={() => removeConversation(item.id)}
                >
                  <Text
                    style={[
                      styles.conversationChipText,
                      activeConversationId === item.id && styles.conversationChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {!isHistoryOpen && !activeConversationId && messages.length <= 1 && (
          <View style={styles.starterPanel}>
            <View style={styles.starterHeader}>
              <View>
                <Text style={styles.starterTitle}>Ideas para empezar</Text>
                <Text style={styles.starterSubtitle}>Basadas en productos del catalogo</Text>
              </View>
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={refreshStarterSuggestions}
                disabled={isLoadingSuggestions}
                activeOpacity={0.75}
              >
                {isLoadingSuggestions ? (
                  <ActivityIndicator size="small" color={colors.primaryStrong} />
                ) : (
                  <Ionicons name="refresh" size={16} color={colors.primaryStrong} />
                )}
                <Text style={styles.regenerateText}>Generar otras</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.starterPills}>
              {starterSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.starterPill}
                  onPress={() => resilientSubmitQuestion(suggestion)}
                  disabled={isLoading}
                  activeOpacity={0.75}
                >
                  <Text style={styles.starterPillText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.typingWrapper} testID="chat-typing-indicator">
            <View style={styles.avatar}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
            <View
              style={[styles.messageBubble, styles.messageBubbleAssistant, styles.typingBubble]}
            >
              <Animated.View style={[styles.typingDot, { opacity: typingAnim1 }]} />
              <Animated.View style={[styles.typingDot, { opacity: typingAnim2 }]} />
              <Animated.View style={[styles.typingDot, { opacity: typingAnim3 }]} />
            </View>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            Platform.OS === 'ios' &&
              keyboardInset > 0 && {
                marginBottom: keyboardInset,
                paddingBottom: 8,
              },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              !inputText.trim() || isLoading ? null : styles.inputWrapperActive,
            ]}
          >
            <TextInput
              style={styles.textInput}
              placeholder="Preguntá lo que quieras..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            testID="send-button"
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function appendMessageIfMissing(messages: Message[], message: Message) {
  if (messages.some((existing) => existing.id === message.id)) {
    return messages;
  }
  return [...messages, message];
}

function toStoredMessage(message: Message): StoredChatMessage {
  return {
    role: message.role,
    text: message.text,
    products: message.products,
    fallback: message.fallback,
  };
}

function translateRisk(risk?: string) {
  switch (risk?.toLowerCase()) {
    case 'bajo':
    case 'low':
      return 'bajo';
    case 'medio':
    case 'medium':
      return 'medio';
    case 'alto':
    case 'high':
      return 'alto';
    default:
      return 'desconocido';
  }
}

function formatConversationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) {
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  if (dayDiff === 1) return 'ayer';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function mapDetailToResultData(detail: any) {
  return {
    id: detail.id,
    product: {
      producto: detail.nombre,
      categoria: detail.categoria,
      ingredientes_detectados: detail.ingredientes || [],
      alergenos: detail.alergenos || [],
      sellos: detail.sellos || [],
      apto_vegano: detail.aptoVegano,
      apto_celiaco: detail.aptoCeliaco,
      apto_sin_lactosa: detail.aptoSinLactosa,
      riesgo: detail.riesgo,
      confidence: detail.confidence,
    },
    rules: {
      reglas_aplicadas: detail.reglasAplicadas || [],
      risk_level: detail.riesgo,
    },
    explanation: detail.explanation,
    disclaimer:
      'NutriLens es un asistente informativo, no reemplaza el consejo de un profesional de nutrición.',
    savedAt: detail.createdAt,
    pipelineTrace: detail.pipelineTrace,
    offEnrichment: detail.offEnrichment ?? null,
  };
}

function MarkdownText({ text }: { text: string }) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isTableSeparator(line));
  return (
    <View>
      {lines.map((line, index) => {
        const trimmed = cleanMarkdownLine(line);
        const isHeading = trimmed.startsWith('#');
        const isBullet = /^[-*]\s+/.test(trimmed);
        const isTable = trimmed.includes('|');
        const content = trimmed.replace(/^#+\s*/, '').replace(/^[-*]\s+/, '');
        if (isTable) {
          const cells = content
            .split('|')
            .map((cell) => cell.trim())
            .filter(Boolean);
          return (
            <View key={`${trimmed}-${index}`} style={styles.markdownTableRow}>
              {cells.map((cell, cellIndex) => (
                <Text key={`${cell}-${cellIndex}`} style={styles.markdownTableCell}>
                  {renderInlineMarkdown(cell)}
                </Text>
              ))}
            </View>
          );
        }
        return (
          <Text
            key={`${trimmed}-${index}`}
            style={[
              styles.messageText,
              styles.messageTextAssistant,
              isHeading && styles.markdownHeading,
              isTable && styles.markdownTable,
            ]}
          >
            {isBullet ? '• ' : ''}
            {renderInlineMarkdown(content)}
          </Text>
        );
      })}
    </View>
  );
}

function cleanMarkdownLine(line: string) {
  return line
    .replace(/\[([^\]]+)\]\(\/(?:historial|catalogo)\/[^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function isTableSeparator(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={`${part}-${index}`} style={styles.markdownBold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: typography.fontSize.xl, fontWeight: 'bold', color: colors.text },
  historyButton: {
    position: 'absolute',
    left: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  historyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  historyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  newChatButton: {
    position: 'absolute',
    right: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  historyPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  historyPanelTitle: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
  },
  historyPanelSubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  historyCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  historyEmptyText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  historyList: { gap: 8, marginBottom: 10 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.bg,
    padding: 8,
  },
  historyRowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRowIconActive: { backgroundColor: colors.primarySoft },
  historyRowText: { flex: 1, minWidth: 0 },
  historyRowTitle: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
  },
  historyRowPreview: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  historyRowDate: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  historyDeleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyNewButton: {
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  historyNewButtonText: {
    color: colors.primaryStrong,
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
  },
  conversationRail: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  conversationRailContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  conversationChip: {
    maxWidth: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  conversationChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  conversationChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  conversationChipTextActive: { color: colors.primaryStrong },
  starterPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  starterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  starterTitle: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
  },
  starterSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  regenerateButton: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  regenerateText: {
    color: colors.primaryStrong,
    fontSize: 12,
    fontWeight: '900',
  },
  starterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  starterPill: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  starterPillText: {
    color: colors.primaryStrong,
    fontSize: 12,
    fontWeight: '800',
  },
  chatContainer: { padding: 16, paddingBottom: 24 },
  messageWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperAssistant: { justifyContent: 'flex-start' },
  messageContent: { maxWidth: '85%', flexShrink: 1 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
    shadowColor: colors.primary,
  },
  messageBubbleAssistant: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: { fontSize: typography.fontSize.base, lineHeight: 24 },
  messageTextUser: { color: '#ffffff', fontWeight: '500' },
  messageTextAssistant: { color: colors.text },
  markdownHeading: { fontWeight: 'bold', marginTop: 4 },
  markdownBold: { fontWeight: 'bold', color: colors.text },
  markdownTable: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  markdownTableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 6,
  },
  markdownTableCell: {
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  productList: { marginTop: 8, gap: 8 },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  productRankText: { color: colors.primaryStrong, fontSize: 12, fontWeight: 'bold' },
  productInfo: { flex: 1 },
  productName: { color: colors.text, fontSize: 13, fontWeight: 'bold' },
  productMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  typingWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggestionPill: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: { color: colors.primaryStrong, fontSize: 12, fontWeight: '600' },
  analyzeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
  },
  analyzeCtaText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: colors.bg,
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    minHeight: 44,
    maxHeight: 128,
  },
  inputWrapperActive: {
    borderColor: colors.primary,
  },
  textInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
