/** 상품 타입: 이름 + 수량 (추후 판매/재입고 로직에서 사용) */
export type Product = {
  name: string;
  quantity: number;
};

/** 등록 가능한 상품 목록 기본값: 각 10개씩 */
export const INITIAL_PRODUCTS: Product[] = [
  { name: "사과", quantity: 10 },
  { name: "바나나", quantity: 10 },
  { name: "물", quantity: 10 },
];
