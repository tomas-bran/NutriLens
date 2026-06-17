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
import { getProductDetail, sendChatMessage } from '../services/api';

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

export default function ChatScreen({ route, navigation }: any) {
  const productData = route?.params?.productData;
  const initialProduct = productData?.product?.producto || productData?.product?.name;

  const [messages, setMessages] = useState<Message[]>([]);
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
    if (initialProduct) {
      setMessages([
        {
          id: Date.now().toString(),
          role: 'assistant',
          text: `¡Hola! Veo que acabás de analizar **${initialProduct}**. ¿Qué te gustaría saber sobre este u otros productos?`,
        },
      ]);
    } else {
      setMessages([
        {
          id: Date.now().toString(),
          role: 'assistant',
          text: '¡Hola! Soy tu asistente nutricional. Preguntame sobre tus productos, por ejemplo: "¿Qué galletitas tengo con menos azúcar?".',
        },
      ]);
    }
  }, [initialProduct]);

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

      setMessages((prev) => appendMessageIfMissing(prev, botMsg));
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
          <Text style={styles.headerTitle}>Asistente IA</Text>
        </View>

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
  },
  headerTitle: { fontSize: typography.fontSize.xl, fontWeight: 'bold', color: colors.text },
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
