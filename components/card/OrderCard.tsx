import type { Order } from "@/app/page";

type OrderCardProps = {
  order: Order;
  isCompleted: boolean;
};

const  OrderCard = ({
  order,
  isCompleted,
}: OrderCardProps) =>{
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

export default OrderCard