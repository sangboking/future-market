"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

import RobotIcon from "@/components/icons/RobotIcon";
import ProductCellModal from "@/components/modal/ProductCellModal";

import type { Product } from "@/constants/products";
import type { Order } from "@/app/page";
/** 빙고판 그리드: 칸이 붙어 있는 형태 (진열대/주문 칸 표현용) */
const BINGO_GRID_COLS = 12;
const BINGO_GRID_ROWS = 4;

/** 빙고판 기준 맨 오른쪽 최하단 칸 = 패킹 구역 (이 칸 방문 시 주문 완료) */
const PACKING_CELL_INDEX = BINGO_GRID_COLS * BINGO_GRID_ROWS - 1;

/** 모달 타입: 상품 등록(빈 칸) | 상품 삭제(채워진 칸) */
type ModalType = "add" | "remove" | null;

type MainProps = {
  products: Product[];
  orders: Order[];
  onOrderComplete: () => void;
  onHasAnyProductChange: (hasAny: boolean) => void;
};

/** 주문에 맞는 상품 칸들만 (중복 제거, 순서는 주문 기준) */
const getProductCellIndices = (
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
const indexToRowCol = (index: number, gridCols: number): [number, number] => {
  return [Math.floor(index / gridCols), index % gridCols];
}

/** (행, 열) → 칸 인덱스 */
const rowColToIndex = (row: number, col: number, gridCols: number): number => {
  return row * gridCols + col;
}

/** 두 칸 사이 최소 이동 칸 수 (맨해튼 거리) */
const stepsBetween = (
  fromIndex: number,
  toIndex: number,
  gridCols: number
): number => {
  const [r1, c1] = indexToRowCol(fromIndex, gridCols);
  const [r2, c2] = indexToRowCol(toIndex, gridCols);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/** 배열의 모든 순열 생성 (최대 약 10개까지 사용) */
const permutations = <T,>(arr: T[]): T[][] => {
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
const getOptimalVisitTargets = (
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
const pathFromTo = (
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
const getFullPath = (
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

/** 로봇(원) 이동 + 완료 처리 (주문별로 key를 주어 마운트 시 stepIndex 0부터 시작) */
const RobotOverlay = ({
  visitSequence,
  onOrderComplete,
  packingCellIndex,
  gridCols,
  gridRows,
  productTargetCellIndices,
}: {
  visitSequence: number[];
  onOrderComplete: () => void;
  packingCellIndex: number;
  gridCols: number;
  gridRows: number;
  /** 상품 픽업 칸 인덱스들 (이 칸에 도착할 때 이펙트 재생) */
  productTargetCellIndices: number[];
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const cellIndex =
    visitSequence.length > 0 ? visitSequence[stepIndex] : packingCellIndex;

  const isAtProductCell = productTargetCellIndices.includes(cellIndex);
  const isAtTargetCell =
    isAtProductCell || cellIndex === packingCellIndex;

  // 칸 간 이동 시간(일정 속도) + 목적지(상품/패킹)에서만 잠시 대기 → 차가 굴러가듯 끊김 없이 이동
  const transitionMs = 420;
  const dwellAtTargetMs = 700;
  const moveDelayMs =
    transitionMs + (isAtTargetCell ? dwellAtTargetMs : 0);

  useEffect(() => {
    if (visitSequence.length === 0) return;

    const timer = setTimeout(() => {
      if (stepIndex < visitSequence.length - 1)
        return setStepIndex((prev) => prev + 1);

      onOrderComplete();
    }, moveDelayMs);

    return () => clearTimeout(timer);
  }, [stepIndex, visitSequence, onOrderComplete, moveDelayMs]);

  const cellCenterStyle = {
    left: `${((cellIndex % gridCols) + 0.5) * (100 / gridCols)}%`,
    top: `${(Math.floor(cellIndex / gridCols) + 0.5) * (100 / gridRows)}%`,
    transform: "translate(-50%, -50%)",
  };

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* 상품 칸 도착 시 픽업 링 이펙트 (한 번 재생 후 사라짐) */}
      {isAtProductCell && (
        <div
          key={stepIndex}
          className="absolute h-12 w-12 rounded-full border-2 border-blue-400 bg-blue-400/20 animate-pickup-ring dark:border-blue-300 dark:bg-blue-300/20"
          style={cellCenterStyle}
        />
      )}
      
      {/* 로봇 캐릭터 */}
      <div
        className={`absolute h-10 w-10 flex items-center justify-center drop-shadow-lg ${
          isAtProductCell ? "animate-pickup-bounce" : ""
        }`}
        style={{
          ...cellCenterStyle,
          transition: `left ${transitionMs}ms linear, top ${transitionMs}ms linear`,
          zIndex: 10,
        }}
        title={`로봇 (칸 ${cellIndex})`}
      >
        <RobotIcon className="h-full w-full text-zinc-700 dark:text-zinc-200" />
      </div>
    </div>
  );
}

const Main = ({
  products,
  orders,
  onOrderComplete,
  onHasAnyProductChange,
}: MainProps) => {
  const totalCells = BINGO_GRID_COLS * BINGO_GRID_ROWS;

  // 칸별 등록된 상품 (null = 빈 칸)
  const [cellProducts, setCellProducts] = useState<(string | null)[]>(
    Array.from({ length: totalCells }, () => null)
  );

  // 모달: 어떤 칸(index)에 대해 어떤 타입의 모달인지
  const [modal, setModal] = useState<{
    cellIndex: number;
    type: ModalType;
  } | null>(null);

  // 현재 처리 중인 주문 (목록의 첫 번째)
  const currentOrder = orders[0] ?? null;

  // 이 주문에 대한 방문 경로: 최소 이동 칸 수로 최적화 후 한 칸씩 이동 (패킹→상품들→패킹)
  const visitSequence = useMemo(() => {
    if (!currentOrder) return [];
    const productCells = getProductCellIndices(currentOrder, cellProducts);
    const optimalTargets = getOptimalVisitTargets(
      productCells,
      PACKING_CELL_INDEX,
      BINGO_GRID_COLS
    );
    return getFullPath(optimalTargets, PACKING_CELL_INDEX, BINGO_GRID_COLS);
  }, [currentOrder, cellProducts]);

  // 상품 픽업 칸만 (패킹 칸 제외) — 로봇이 이 칸에 도착할 때 이펙트 재생용
  const productTargetCellIndices = useMemo(() => {
    if (!currentOrder) return [];
    const productCells = getProductCellIndices(currentOrder, cellProducts);
    const optimalTargets = getOptimalVisitTargets(
      productCells,
      PACKING_CELL_INDEX,
      BINGO_GRID_COLS
    );
    return optimalTargets.slice(0, -1);
  }, [currentOrder, cellProducts]);

  const selectedCellIndex = modal?.cellIndex ?? null;
  const modalType = modal?.type ?? null;
  const selectedProduct =
    selectedCellIndex !== null ? cellProducts[selectedCellIndex] : null;

  const displayedProductNames = useMemo(
    () => cellProducts.filter((name): name is string => name !== null),
    [cellProducts]
  );

  const hasAnyProduct = useMemo(
    () => cellProducts.some((name) => name !== null),
    [cellProducts]
  );

  useEffect(() => {
    onHasAnyProductChange(hasAnyProduct);
  }, [hasAnyProduct, onHasAnyProductChange]);

  /** 빈 칸 클릭 → 상품 등록 모달 */
  const handleEmptyCellClick = useCallback((cellIndex: number) => {
    setModal({ cellIndex, type: "add" });
  }, []);

  /** 채워진 칸 클릭 → 상품 삭제 모달 */
  const handleFilledCellClick = useCallback((cellIndex: number) => {
    setModal({ cellIndex, type: "remove" });
  }, []);

  /** 상품 등록 */
  const handleAddProduct = useCallback(
    (product: string) => {
      if (selectedCellIndex === null) return;
      setCellProducts((prev) => {
        const next = [...prev];
        next[selectedCellIndex] = product;
        return next;
      });
      setModal(null);
    },
    [selectedCellIndex]
  );

  /** 상품 삭제 */
  const handleRemoveProduct = useCallback(() => {
    if (selectedCellIndex === null) return;
    setCellProducts((prev) => {
      const next = [...prev];
      next[selectedCellIndex] = null;
      return next;
    });
    setModal(null);
  }, [selectedCellIndex]);

  const closeModal = useCallback(() => setModal(null), []);

  return (
    <main className="flex-1 min-w-0 overflow-auto p-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-xl font-semibold">진열대</h2>

        {/* 진열대 + 로봇(원) 오버레이를 감싸는 상대 위치 컨테이너 */}
        <div
          className="relative w-full"
          style={{
            aspectRatio: `${BINGO_GRID_COLS} / ${BINGO_GRID_ROWS}`,
          }}
        >
          {/* 진열대 */}
          <div
            className="grid h-full w-full gap-0 overflow-hidden rounded border border-zinc-300 dark:border-zinc-600"
            style={{
              gridTemplateColumns: `repeat(${BINGO_GRID_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${BINGO_GRID_ROWS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: totalCells }, (_, index) => {
              const product = cellProducts[index];
              const isEmpty = product === null;
              const isPackingCell = index === PACKING_CELL_INDEX;

              return (
                <button
                  key={index}
                  type="button"
                  disabled={isPackingCell}
                  onClick={() => {
                    if (isPackingCell) return;
                    isEmpty
                      ? handleEmptyCellClick(index)
                      : handleFilledCellClick(index);
                  }}
                  className={`min-h-0 border-r border-b border-zinc-300 text-left nth-[12n]:border-r-0 nth-[n+37]:border-b-0 ${
                    isPackingCell
                      ? "bg-zinc-200 dark:bg-zinc-800 cursor-default"
                      : isEmpty
                      ? "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                      : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/25 dark:hover:bg-amber-900/40"
                  }`}
                  role="gridcell"
                  aria-label={
                    isPackingCell
                      ? "입구 (패킹 구역)"
                      : isEmpty
                      ? `빈 칸 ${index + 1} - 상품 등록`
                      : `칸 ${index + 1} ${product} - 삭제`
                  }
                >
                  {isPackingCell ? (
                    <span className="flex h-full flex-col items-center justify-center p-1 text-center">
                      <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                        입구
                      </span>
                    </span>
                  ) : (
                    product && (
                      <span className="flex h-full flex-col items-center justify-center gap-0.5 p-1 text-center">
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {product}
                        </span>
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>

          {/* 로봇(원): 주문별로 상품 칸 → 패킹 칸 순서로 이동, 완료 시 리스트에서 제거 */}
          <RobotOverlay
            key={currentOrder?.id ?? "idle"}
            visitSequence={visitSequence}
            onOrderComplete={onOrderComplete}
            packingCellIndex={PACKING_CELL_INDEX}
            gridCols={BINGO_GRID_COLS}
            gridRows={BINGO_GRID_ROWS}
            productTargetCellIndices={productTargetCellIndices}
          />
        </div>
      </div>

      <ProductCellModal
        isOpen={modal !== null}
        type={modalType}
        products={products}
        displayedProductNames={displayedProductNames}
        selectedProduct={selectedProduct}
        onAddProduct={handleAddProduct}
        onRemoveProduct={handleRemoveProduct}
        onClose={closeModal}
      />
    </main>
  );
};

export default Main;
