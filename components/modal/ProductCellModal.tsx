"use client";

import { useEffect } from "react";

import type { Product } from "@/constants/products";

type ModalKind = "add" | "remove" | null;

type ProductCellModalProps = {
  isOpen: boolean;
  type: ModalKind;
  products: Product[];
  displayedProductNames: string[];
  selectedProduct: string | null;
  onAddProduct: (name: string) => void;
  onRemoveProduct: () => void;
  onClose: () => void;
};

const ProductCellModal = ({
  isOpen,
  type,
  products,
  displayedProductNames,
  selectedProduct,
  onAddProduct,
  onRemoveProduct,
  onClose,
}: ProductCellModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title" className="mb-3 text-base font-semibold">
          {type === "add" ? "상품 등록" : "상품 삭제"}
        </h3>

        {type === "add" && (
          <>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              등록할 상품을 선택하세요.
            </p>
            <div className="flex flex-wrap gap-2">
              {products.map((p) => {
                const isAlreadyDisplayed =
                  displayedProductNames.includes(p.name);
                return (
                  <button
                    key={p.name}
                    type="button"
                    disabled={isAlreadyDisplayed}
                    onClick={() =>
                      !isAlreadyDisplayed && onAddProduct(p.name)
                    }
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      isAlreadyDisplayed
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                        : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    }`}
                    title={
                      isAlreadyDisplayed
                        ? "이미 진열된 상품입니다"
                        : `${p.name} 등록`
                    }
                  >
                    {p.name} ({p.quantity}개 남음)
                  </button>
                );
              })}
            </div>
          </>
        )}

        {type === "remove" && selectedProduct !== null && (
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
                onClick={onClose}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onRemoveProduct}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </>
        )}

        {type === "add" && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCellModal;

