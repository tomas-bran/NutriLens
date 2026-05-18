import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object para `/chat` (E05). Encapsula los selectores y los verbos del
 * dominio para que los `.spec.ts` lean como user journeys.
 *
 * Selectores tomados del snapshot accesible real del MCP — todos están
 * basados en `data-testid` agregados en los componentes de chat.
 */
export class ChatPage {
  private readonly header: Locator;
  private readonly hero: Locator;
  private readonly thinking: Locator;
  private readonly input: Locator;
  private readonly newConversationButton: Locator;
  private readonly errorBanner: Locator;
  private readonly retryButton: Locator;
  private readonly analyzeCta: Locator;
  private readonly suggestions: Locator;
  private readonly userBubbles: Locator;
  private readonly assistantBubbles: Locator;
  private readonly productChips: Locator;

  constructor(private readonly page: Page) {
    this.header = page.getByRole('heading', { level: 1, name: 'Chat NutriLens' });
    this.hero = page.getByTestId('chat-hero');
    this.thinking = page.getByTestId('chat-thinking');
    this.input = page.getByTestId('chat-input');
    this.newConversationButton = page.getByTestId('chat-new-conversation');
    this.errorBanner = page.getByTestId('chat-error');
    this.retryButton = page.getByTestId('chat-retry');
    this.analyzeCta = page.getByTestId('chat-analyze-cta');
    this.suggestions = page.getByTestId('chat-suggestion');
    this.userBubbles = page.getByTestId('chat-user-bubble');
    this.assistantBubbles = page.getByTestId('chat-assistant-bubble');
    this.productChips = page.getByTestId('chat-product-chip');
  }

  async goto() {
    await this.page.goto('/chat');
    await expect(this.header).toBeVisible();
  }

  async askQuestion(text: string) {
    await this.input.fill(text);
    await this.input.press('Enter');
  }

  async clickSuggestion(index: number) {
    await this.suggestions.nth(index).click();
  }

  async clickNewConversation() {
    await this.newConversationButton.click();
  }

  async clickRetry() {
    await this.retryButton.click();
  }

  async clickAnalyzeCta() {
    await this.analyzeCta.click();
  }

  async clickProductChip(index: number) {
    await this.productChips.nth(index).click();
  }

  // --- Aserciones ---

  async expectHeroVisible() {
    await expect(this.hero).toBeVisible();
  }

  async expectHeroHidden() {
    await expect(this.hero).toBeHidden();
  }

  async expectAssistantAnswerContains(text: string) {
    await expect(this.assistantBubbles.last()).toContainText(text);
  }

  async expectUserMessageContains(text: string) {
    await expect(this.userBubbles.last()).toContainText(text);
  }

  async expectUserMessagesCount(n: number) {
    await expect(this.userBubbles).toHaveCount(n);
  }

  async expectAssistantMessagesCount(n: number) {
    await expect(this.assistantBubbles).toHaveCount(n);
  }

  async expectProductChipsCount(n: number) {
    await expect(this.productChips).toHaveCount(n);
  }

  async expectThinking() {
    await expect(this.thinking).toBeVisible();
  }

  async expectIdle() {
    await expect(this.thinking).toBeHidden();
  }

  async expectErrorVisible(messageContains?: string) {
    await expect(this.errorBanner).toBeVisible();
    if (messageContains) {
      await expect(this.errorBanner).toContainText(messageContains);
    }
  }

  async expectAnalyzeCtaVisible() {
    await expect(this.analyzeCta).toBeVisible();
    await expect(this.analyzeCta).toHaveAttribute('href', '/analizar');
  }

  async expectAnalyzeCtaHidden() {
    await expect(this.analyzeCta).toBeHidden();
  }

  async expectInputDisabled() {
    await expect(this.input).toBeDisabled();
  }

  async expectInputEnabled() {
    await expect(this.input).toBeEnabled();
  }

  async expectNewConversationDisabled() {
    await expect(this.newConversationButton).toBeDisabled();
  }

  async expectNewConversationEnabled() {
    await expect(this.newConversationButton).toBeEnabled();
  }

  async expectHeaderProductsCount(n: number) {
    const label = n === 1 ? `${n} producto en tu base` : `${n} productos en tu base`;
    await expect(this.page.getByText(label)).toBeVisible();
  }

  /**
   * US-31: confirma que el último mensaje del asistente trae una tabla
   * markdown renderizada (contraste de ingredientes/alérgenos/sellos/riesgo).
   */
  async expectAssistantTableVisible() {
    const lastBubble = this.assistantBubbles.last();
    await expect(lastBubble.locator('table')).toBeVisible();
  }

  /** US-31: confirma que el último mensaje del asistente NO trae tabla. */
  async expectAssistantNoTable() {
    const lastBubble = this.assistantBubbles.last();
    await expect(lastBubble.locator('table')).toHaveCount(0);
  }

  /**
   * US-31 §2: confirma que el mensaje incluye el nombre faltante
   * (en cualquier formato — el helper canónico lo envuelve en comillas).
   */
  async expectMissingProductMessage(name: string) {
    await expect(this.assistantBubbles.last()).toContainText(name);
  }
}
