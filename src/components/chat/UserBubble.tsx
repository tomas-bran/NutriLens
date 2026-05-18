/**
 * <UserBubble> — burbuja verde alineada a la derecha con el mensaje del
 * usuario. Pencil ref: `J8ttwM` (M12) y `itrsn` (D05).
 */

interface UserBubbleProps {
  text: string;
}

export function UserBubble({ text }: UserBubbleProps) {
  return (
    <div className="flex w-full justify-end">
      <div
        data-testid="chat-user-bubble"
        className="max-w-[85%] rounded-3xl rounded-br-md bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white shadow-[0_2px_8px_0_rgba(22,163,74,0.18)] md:max-w-[70%] md:px-5 md:py-3 md:text-base"
      >
        {text}
      </div>
    </div>
  );
}
