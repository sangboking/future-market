import type { Order } from "@/app/page";

/** 진열대 그리드: 칸이 붙어 있는 형태 (진열대/주문 칸 표현용) */
export const DISPLAY_STAND_GRID_COLS = 12;
export const DISPLAY_STAND_GRID_ROWS = 4;

/** 진열대 기준 맨 오른쪽 최하단 칸 = 패킹 구역 (이 칸 방문 시 주문 완료) */
export const PACKING_CELL_INDEX = DISPLAY_STAND_GRID_COLS * DISPLAY_STAND_GRID_ROWS - 1;

/** 주문에 맞는 상품 칸들만 (중복 제거, 순서는 주문 기준) */
export const getProductCellIndices = (
  order: Order,
  cellProducts: (string | null)[]
): number[] => {  
  const cells: number[] = [];
  const seenProducts = new Set<string>();

  order.items.forEach((item) => {
    if (seenProducts.has(item.productName)) return;
    seenProducts.add(item.productName);
    const cellIndex = cellProducts.findIndex((p) => p === item.productName);
    if (cellIndex !== -1) cells.push(cellIndex);
  });

  return cells;
}

/** 칸 인덱스 → (행, 열) */
export const indexToRowCol = (index: number, gridCols: number): [number, number] => {
  return [Math.floor(index / gridCols), index % gridCols];
}

/** (행, 열) → 칸 인덱스 */
export const rowColToIndex = (row: number, col: number, gridCols: number): number => {
  return row * gridCols + col;
}

/** 두 칸 사이 최소 이동 칸 수 (맨해튼 거리) */
export const stepsBetween = (
  fromIndex: number,
  toIndex: number,
  gridCols: number
): number => {
  const [r1, c1] = indexToRowCol(fromIndex, gridCols);
  const [r2, c2] = indexToRowCol(toIndex, gridCols);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/** 배열의 모든 순열 생성 (최대 약 10개까지 사용) */
export const permutations = <T,>(arr: T[]): T[][] => {
  // 기저 사례: 빈 배열 처리 추가
  if (arr.length === 0) return [[]];
  if (arr.length === 1) return [arr];

  const result: T[][] = [];

  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    // slice 대신 filter 등을 사용할 수도 있지만, 현재 방식이 효율적입니다.
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    
    for (const perm of permutations(rest)) {
      result.push([current, ...perm]);
    }
  }

  return result;
};

/**
 * 상품 칸 방문 순서 최적화: 패킹(시작/종료) → 상품들 → 패킹
 * 총 이동 칸 수가 최소가 되는 순서로 정렬
 */
export const getOptimalVisitTargets = (
  productCells: number[],
  packingCellIndex: number,
  gridCols: number
): number[] =>{
  if (productCells.length === 0) return [packingCellIndex];
  if (productCells.length === 1)
    return [productCells[0], packingCellIndex];

  const allPerms = permutations(productCells);
  let bestOrder: number[] = allPerms[0];
  let bestTotal = Infinity;

  for (const perm of allPerms) {
    let total =
      stepsBetween(packingCellIndex, perm[0], gridCols) +
      stepsBetween(perm[perm.length - 1], packingCellIndex, gridCols);
    for (let i = 0; i < perm.length - 1; i++) {
      total += stepsBetween(perm[i], perm[i + 1], gridCols);
    }
    if (total < bestTotal) {
      bestTotal = total;
      bestOrder = perm;
    }
  }

  return [...bestOrder, packingCellIndex];
}

/** A칸에서 B칸까지 한 칸씩 이동하는 경로 (A 제외, B 포함). 가로 먼저, 그다음 세로 */
export const pathFromTo = (
  fromIndex: number,
  toIndex: number,
  gridCols: number
): number[] => {
  const [r1, c1] = indexToRowCol(fromIndex, gridCols);
  const [r2, c2] = indexToRowCol(toIndex, gridCols);
  const steps: number[] = [];
  let r = r1;
  let c = c1;

  const dc = c2 > c1 ? 1 : c2 < c1 ? -1 : 0;
  while (c !== c2) {
    c += dc;
    steps.push(rowColToIndex(r, c, gridCols));
  }
  const dr = r2 > r1 ? 1 : r2 < r1 ? -1 : 0;
  while (r !== r2) {
    r += dr;
    steps.push(rowColToIndex(r, c, gridCols));
  }
  return steps;
}

/** 방문 목표들을 한 칸씩 이동하는 전체 경로로 확장 (시작 칸에서 목표들 순서대로) */
export const getFullPath = (
  targets: number[],
  startCellIndex: number,
  gridCols: number
) : number[] =>  {
  if (targets.length === 0) return [startCellIndex];

  const path: number[] = [startCellIndex];
  let last = startCellIndex;

  for (const target of targets) {
    const steps = pathFromTo(last, target, gridCols);
    path.push(...steps);
    last = target;
  }

  return path;
}
