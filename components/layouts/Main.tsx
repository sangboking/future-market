"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

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
  /** 페이지에서 관리하는 상품 배열 (이름·수량 - 진열대에서 남은 갯수 표시용) */
  products: Product[];
  /** 대기 중인 주문 목록 (첫 번째 주문을 로봇이 처리) */
  orders: Order[];
  /** 주문 완료 시 호출 (해당 주문을 리스트에서 제거) */
  onOrderComplete: () => void;
};

/** 주문에 맞는 상품 칸들만 (중복 제거, 순서는 주문 기준) */
function getProductCellIndices(
  order: Order,
  cellProducts: (string | null)[]
): number[] {
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
function indexToRowCol(index: number, gridCols: number): [number, number] {
  return [Math.floor(index / gridCols), index % gridCols];
}

/** (행, 열) → 칸 인덱스 */
function rowColToIndex(row: number, col: number, gridCols: number): number {
  return row * gridCols + col;
}

/** 두 칸 사이 최소 이동 칸 수 (맨해튼 거리) */
function stepsBetween(
  fromIndex: number,
  toIndex: number,
  gridCols: number
): number {
  const [r1, c1] = indexToRowCol(fromIndex, gridCols);
  const [r2, c2] = indexToRowCol(toIndex, gridCols);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/** 배열의 모든 순열 생성 (최대 약 10개까지 사용) */
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/**
 * 상품 칸 방문 순서 최적화: 패킹(시작/종료) → 상품들 → 패킹
 * 총 이동 칸 수가 최소가 되는 순서로 정렬
 */
function getOptimalVisitTargets(
  productCells: number[],
  packingCellIndex: number,
  gridCols: number
): number[] {
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
function pathFromTo(
  fromIndex: number,
  toIndex: number,
  gridCols: number
): number[] {
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
function getFullPath(
  targets: number[],
  startCellIndex: number,
  gridCols: number
): number[] {
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
function RobotOverlay({
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
}) {
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
      if (stepIndex < visitSequence.length - 1) {
        setStepIndex((prev) => prev + 1);
      } else {
        onOrderComplete();
      }
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
          className="absolute h-12 w-12 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-pickup-ring dark:border-amber-300 dark:bg-amber-300/20"
          style={cellCenterStyle}
        />
      )}
      <div
        className={`absolute h-8 w-8 rounded-full border-2 border-zinc-700 bg-amber-400 shadow-md dark:border-amber-200 dark:bg-amber-500 ${
          isAtProductCell ? "animate-pickup-bounce" : ""
        }`}
        style={{
          ...cellCenterStyle,
          transition: `left ${transitionMs}ms linear, top ${transitionMs}ms linear`,
        }}
        title={`로봇 (칸 ${cellIndex})`}
      />
    </div>
  );
}

const Main = ({ products, orders, onOrderComplete }: MainProps) => {
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

  /** 모달 닫기 (배경 클릭 또는 취소) */
  const closeModal = useCallback(() => setModal(null), []);

  // Escape 키로 모달 닫기
  useEffect(() => {
    if (modal === null) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [modal, closeModal]);

  return (
    <main className="flex-1 min-w-0 overflow-auto p-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-xl font-semibold">진열대</h2>

        {/* 빙고판 + 로봇(원) 오버레이를 감싸는 상대 위치 컨테이너 */}
        <div
          className="relative w-full"
          style={{
            aspectRatio: `${BINGO_GRID_COLS} / ${BINGO_GRID_ROWS}`,
          }}
        >
          {/* 칸 사이 간격 없이 붙어 있는 빙고판 */}
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
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    isEmpty
                      ? handleEmptyCellClick(index)
                      : handleFilledCellClick(index)
                  }
                  className={`min-h-0 border-r border-b border-zinc-300 text-left nth-[12n]:border-r-0 nth-[n+37]:border-b-0 ${
                    isEmpty
                      ? "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                      : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/25 dark:hover:bg-amber-900/40"
                  }`}
                  role="gridcell"
                  aria-label={
                    isEmpty
                      ? `빈 칸 ${index + 1} - 상품 등록`
                      : `칸 ${index + 1} ${product} - 삭제`
                  }
                >
                  {product && (
                    <span className="flex h-full flex-col items-center justify-center gap-0.5 p-1 text-center">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {product}
                      </span>
                    </span>
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

      {/* 모달 배경: 클릭 시 닫기 */}
      {modal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* 작은 모달 박스: 배경 클릭 전파 방지 */}
          <div
            className="w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="modal-title" className="mb-3 text-base font-semibold">
              {modalType === "add" ? "상품 등록" : "상품 삭제"}
            </h3>

            {modalType === "add" && (
              <>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  등록할 상품을 선택하세요.
                </p>
                <div className="flex flex-wrap gap-2">
                  {products.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleAddProduct(p.name)}
                      className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    >
                      {p.name} ({p.quantity}개 남음)
                    </button>
                  ))}
                </div>
              </>
            )}

            {modalType === "remove" && selectedProduct !== null && (
              <>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {selectedProduct}
                  </strong>
                  을(를) 삭제할까요?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveProduct}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    삭제
                  </button>
                </div>
              </>
            )}

            {modalType === "add" && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Main;
