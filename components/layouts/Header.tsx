type HeaderProps = {
  isOrdering: boolean;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
};

const Header = ({ isOrdering, canStart, onStart, onStop }: HeaderProps) => {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-lg font-semibold">FutureMarket</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={isOrdering || !canStart}
          className={`rounded-md px-3 py-1 text-sm font-medium border ${
            isOrdering || !canStart
              ? "cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
              : "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          }`}
        >
          주문 시작
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!isOrdering}
          className={`rounded-md px-3 py-1 text-sm font-medium border ${
            !isOrdering
              ? "cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
              : "border-red-500 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-900/30"
          }`}
        >
          주문 중단
        </button>
      </div>
    </header>
  );
};

export default Header;
