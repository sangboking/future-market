"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

import RobotOverlay from "@/components/robot/RobotOverlay";
import ProductCellModal from "@/components/modal/ProductCellModal";

import type { Product } from "@/constants/products";
import type { Order } from "@/app/page";
import {
  DISPLAY_STAND_GRID_COLS,
  DISPLAY_STAND_GRID_ROWS,
  PACKING_CELL_INDEX,
  getProductCellIndices,
  getOptimalVisitTargets,
  getFullPath,
} from "@/utils/displayStand";

/** 모달 타입: 상품 등록(빈 칸) | 상품 삭제(채워진 칸) */
type ModalType = "add" | "remove" | null;

type MainProps = {
  products: Product[];
  orders: Order[];
  onOrderComplete: () => void;
  setHasAnyProductOnShelf: React.Dispatch<React.SetStateAction<boolean>>;
  onDisplayedProductsChange: (names: string[]) => void;
};

const Main = ({
  products,
  orders,
  onOrderComplete,
  setHasAnyProductOnShelf,
  onDisplayedProductsChange,
}: MainProps) => {
  const totalCells = DISPLAY_STAND_GRID_COLS * DISPLAY_STAND_GRID_ROWS;

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
      DISPLAY_STAND_GRID_COLS
    );
    return getFullPath(optimalTargets, PACKING_CELL_INDEX, DISPLAY_STAND_GRID_COLS);
  }, [currentOrder, cellProducts]);

  // 상품 픽업 칸만 (패킹 칸 제외) — 로봇이 이 칸에 도착할 때 이펙트 재생용
  const productTargetCellIndices = useMemo(() => {
    if (!currentOrder) return [];
    const productCells = getProductCellIndices(currentOrder, cellProducts);
    const optimalTargets = getOptimalVisitTargets(
      productCells,
      PACKING_CELL_INDEX,
      DISPLAY_STAND_GRID_COLS
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
    setHasAnyProductOnShelf(hasAnyProduct);
  }, [hasAnyProduct, setHasAnyProductOnShelf]);

  useEffect(() => {
    onDisplayedProductsChange(displayedProductNames);
  }, [displayedProductNames, onDisplayedProductsChange]);

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

  const handleBoxClick = (isPackingCell :boolean, isEmpty :boolean, index :number) => {
    if (isPackingCell) return;

    return isEmpty ? handleEmptyCellClick(index) : handleFilledCellClick(index);        
  };

  const getBoxStatusClass = (isPackingCell: boolean, isEmpty: boolean) => {
  // 1. 패킹된 셀 (가장 우선순위 높음)
  if (isPackingCell) {
    return "bg-zinc-200 dark:bg-zinc-800 cursor-default";
  }

  // 2. 비어있는 셀
  if (isEmpty) {
    return "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800";
  }

  // 3. 나머지는 채워진 셀 (Default)
  return "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/25 dark:hover:bg-amber-900/40";
};

const getBoxAriaLabel = (isPackingCell: boolean, isEmpty: boolean, index: number, product: string | null) => {
  // 1. 패킹 구역
  if (isPackingCell) return "입구 (패킹 구역)";

  // 2. 빈 칸 (등록 안내)
  if (isEmpty) return `빈 칸 ${index + 1} - 상품 등록`;

  // 3. 채워진 칸 (상품 정보 및 삭제 안내)
  return `칸 ${index + 1} ${product || ''} - 삭제`;
};

  

  return (
    <main className="flex-1 min-w-0 overflow-auto p-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-xl font-semibold">진열대</h2>

        {/* 진열대 + 로봇(원) 오버레이를 감싸는 상대 위치 컨테이너 */}
        <div
          className="relative w-full"
          style={{
            aspectRatio: `${DISPLAY_STAND_GRID_COLS} / ${DISPLAY_STAND_GRID_ROWS}`,
          }}
        >
          {/* 진열대 */}
          <div
            className="grid h-full w-full gap-0 overflow-hidden rounded border border-zinc-300 dark:border-zinc-600"
            style={{
              gridTemplateColumns: `repeat(${DISPLAY_STAND_GRID_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${DISPLAY_STAND_GRID_ROWS}, minmax(0, 1fr))`,
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
                  onClick={() => handleBoxClick(isPackingCell, isEmpty, index)}  
                  className={`min-h-0 border-r border-b border-zinc-300 text-left nth-[12n]:border-r-0 nth-[n+37]:border-b-0 ${
                    getBoxStatusClass(isPackingCell, isEmpty)
                  }`}
                  role="gridcell"
                  aria-label={
                    getBoxAriaLabel(isPackingCell, isEmpty, index, product)
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
            gridCols={DISPLAY_STAND_GRID_COLS}
            gridRows={DISPLAY_STAND_GRID_ROWS}
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
