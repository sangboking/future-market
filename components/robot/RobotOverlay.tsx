import { useEffect, useState } from "react";

import RobotIcon from "@/components/robot/RobotIcon";

type RobotOverlayProps = {
  visitSequence: number[];
  onOrderComplete: () => void;
  packingCellIndex: number;
  gridCols: number;
  gridRows: number;
  productTargetCellIndices: number[];
};

const RobotOverlay = ({
  visitSequence,
  onOrderComplete,
  packingCellIndex,
  gridCols,
  gridRows,
  productTargetCellIndices,
}: RobotOverlayProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const cellIndex =
    visitSequence.length > 0 ? visitSequence[stepIndex] : packingCellIndex;

  const isAtProductCell = productTargetCellIndices.includes(cellIndex);
  const isAtTargetCell =
    isAtProductCell || cellIndex === packingCellIndex;

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
      {isAtProductCell && (
        <div
          key={stepIndex}
          className="absolute h-12 w-12 rounded-full border-2 border-blue-400 bg-blue-400/20 animate-pickup-ring dark:border-blue-300 dark:bg-blue-300/20"
          style={cellCenterStyle}
        />
      )}

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
};

export default RobotOverlay;

