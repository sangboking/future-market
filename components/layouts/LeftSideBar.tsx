"use client";

import type { Order } from "@/app/page";

type LeftSideBarProps = {
  orders: Order[];
  completedOrders: Order[];
};

/** 주문 카드 한 장 (대기/완료 공통) */
function OrderCard({
  order,
  isCompleted,
}: {
  order: Order;
  isCompleted: boolean;
}) {
  return (
    <li
      className={`rounded border p-2 text-sm ${
        isCompleted
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <div className="mb-1 flex items-center justify-between font-medium">
        <span className="text-zinc-800 dark:text-zinc-200">주문 #{order.id}</span>
        {isCompleted && (
          <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs text-white dark:bg-emerald-700">
            완료
          </span>
        )}
      </div>
      <ul className="space-y-0.5 text-zinc-600 dark:text-zinc-400">
        {order.items.map((item) => (
          <li key={item.productName}>
            {item.productName} × {item.quantity}
          </li>
        ))}
      </ul>
    </li>
  );
}

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
