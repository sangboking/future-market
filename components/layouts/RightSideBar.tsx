"use client";

import type { Product } from "@/constants/products";

type RightSideBarProps = {
  products: Product[];
  handleRestock: (name: string, delta: number) => void;
};

const RightSideBar = ({ products, handleRestock }: RightSideBarProps) => {
  return (
    <aside className="w-64 shrink-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">남은 상품 수량</h3>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {products.map((p) => (
            <li
              key={p.name}
              className="flex items-center justify-between gap-2"
            >
              <span>
                {p.name}: {p.quantity}개
              </span>
              <button
                type="button"
                onClick={() => handleRestock(p.name, 5)}
                className="rounded-md border border-emerald-500 px-2 py-0.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                +5 추가
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default RightSideBar;
