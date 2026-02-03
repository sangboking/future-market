"use client";

import type { Product } from "@/constants/products";

type RightSideBarProps = {
  products: Product[];
  setProductsForView: React.Dispatch<React.SetStateAction<Product[]>>;
};

const RightSideBar = ({ products, setProductsForView }: RightSideBarProps) => {
  // setProducts: 추후 판매/재입고 로직에서 사용 예정

  return (
    <aside className="w-56 shrink-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="p-4">
        <h3 className="mb-3 text-sm font-semibold">남은 상품 수량</h3>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {products.map((p) => (
            <li key={p.name}>
              {p.name}: {p.quantity}개
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default RightSideBar;
