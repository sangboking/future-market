"use client";

import OrderCard from "@/components/card/OrderCard";

import type { Order } from "@/app/page";


type LeftSideBarProps = {
  orders: Order[];
  completedOrders: Order[];
};



const LeftSideBar = ({ orders, completedOrders }: LeftSideBarProps) => {
  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-1 min-h-0 flex-col overflow-auto p-4">
        {/* 대기 중인 주문 */}
        <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          주문 목록
        </h3>
        <ul className="mb-4 space-y-2">
          {orders.length === 0 ? (
            <li className="text-sm text-zinc-500 dark:text-zinc-400">
              대기 중인 주문 없음
            </li>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} isCompleted={false} />
            ))
          )}
        </ul>

        {/* 완료된 주문 */}
        <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          완료된 주문
        </h3>
        <ul className="space-y-2">
          {completedOrders.length === 0 ? (
            <li className="text-sm text-zinc-500 dark:text-zinc-400">
              완료된 주문 없음
            </li>
          ) : (
            completedOrders.map((order) => (
              <OrderCard key={order.id} order={order} isCompleted />
            ))
          )}
        </ul>
      </div>
    </aside>
  );
};

export default LeftSideBar;
