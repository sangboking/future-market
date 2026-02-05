"use client";

import { useEffect, useRef, useState } from "react";

import Header from "@/components/layouts/Header";
import LeftSideBar from "@/components/layouts/LeftSideBar";
import Main from "@/components/layouts/Main";
import RightSideBar from "@/components/layouts/RightSideBar";

import type { Product } from "@/constants/products";
import { INITIAL_PRODUCTS } from "@/constants/products";

//재주문 시뮬레이션 인터벌 시간
const ORDER_INTERVAL_MS = 15 * 1000;

export type Order = {
  id: number;
  items: { productName: string; quantity: number }[];
  createdAt: number;
};

export default function Home() {
  const stockRef = useRef<Map<string, number>>(new Map());
  const nextOrderIdRef = useRef(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const displayedProductNamesRef = useRef<string[]>([]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [productsForView, setProductsForView] =
    useState<Product[]>(INITIAL_PRODUCTS);
  const [isOrdering, setIsOrdering] = useState(false);
  const [hasAnyProductOnShelf, setHasAnyProductOnShelf] = useState(false);


  const createRandomOrder = (
    stock: Map<string, number>,
    nextOrderId: number,
    displayedProductNames: string[]
  ): Order | null => {
    const displayedSet = new Set(displayedProductNames);
    const candidates = Array.from(stock.entries()).filter(
      ([name, qty]) => qty > 0 && displayedSet.has(name)
    );

    if (candidates.length === 0) return null;

    const items: Order["items"] = [];

    candidates.forEach(([name, available]) => {
      if (Math.random() < 0.5) {
        const quantity = Math.floor(Math.random() * available) + 1;
        items.push({ productName: name, quantity });
      }
    });

    if (items.length === 0) {
      const [name, available] =
        candidates[Math.floor(Math.random() * candidates.length)];
      const quantity = Math.floor(Math.random() * available) + 1;
      items.push({ productName: name, quantity });
    }

    return {
      id: nextOrderId,
      items,
      createdAt: Date.now(),
    };
  };

  /** 초기 재고 세팅 */
  useEffect(() => {
    const stock = new Map<string, number>();

    INITIAL_PRODUCTS.forEach((el) => {
      stock.set(el.name, el.quantity);
    });

    stockRef.current = stock;
  }, []);

  /** 주문 → 재고 반영 + 화면용 상품 갱신 */
  useEffect(() => {
    const nextProducts = INITIAL_PRODUCTS.map((el) => {
      const quantity = stockRef.current.get(el.name) ?? 0;
      return { ...el, quantity };
    });
    setProductsForView(nextProducts);
  }, [orders]);

  useEffect(() => {
    if (!isOrdering) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const run = () => {
      const order = createRandomOrder(
        stockRef.current,
        nextOrderIdRef.current,
        displayedProductNamesRef.current
      );

      if (order) {
        order.items.forEach((item) => {
          const current = stockRef.current.get(item.productName) ?? 0;

          stockRef.current.set(
            item.productName,
            Math.max(0, current - item.quantity)
          );
        });

        nextOrderIdRef.current += 1;
        setOrders((prev) => [...prev, order]);
      }

      timerRef.current = setTimeout(run, ORDER_INTERVAL_MS);
    };

    run();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOrdering]);

  const handleStartOrdering = () => {
    if (!hasAnyProductOnShelf) return;
    setIsOrdering(true);
  };

  const handleDisplayedProductsChange = (names: string[]) => {
    displayedProductNamesRef.current = names;
  };

  const handleRestock = (name: string, addQuantity: number) => {
    const current = stockRef.current.get(name) ?? 0;
    const next = Math.max(0, current + addQuantity);
    stockRef.current.set(name, next);

    setProductsForView((prev) =>
      prev.map((p) =>
        p.name === name ? { ...p, quantity: next } : p
      )
    );
  };

  const onOrderComplete = () => {
    const completed = orders[0];
    if (completed) setCompletedOrders((prev) => [...prev, completed]);
    setOrders((prev) => prev.slice(1));
  }

 

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 font-sans dark:bg-zinc-950">
      <Header
        isOrdering={isOrdering}
        canStart={hasAnyProductOnShelf}
        onStart={handleStartOrdering}
        onStop={() => setIsOrdering(false)}
      />

      <div className="flex flex-1 min-h-0">
        <LeftSideBar orders={orders} completedOrders={completedOrders} />

        <Main
          products={productsForView}
          orders={orders}
          onOrderComplete={onOrderComplete}
          setHasAnyProductOnShelf={setHasAnyProductOnShelf}
          onDisplayedProductsChange={handleDisplayedProductsChange}
        />

        <RightSideBar
          products={productsForView}
          handleRestock={handleRestock}
        />
      </div>
    </div>
  );
}
