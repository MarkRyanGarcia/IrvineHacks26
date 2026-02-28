import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import PropertyCard from "../components/PropertyCard";
import ProgressBar from "../components/ProgressBar";
import { MOCK_PROPERTIES } from "../data/properties";
import type { PropertyCard as CardType, SwipeProfile } from "../types";

function median(arr: number[]) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export default function SwipePage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<CardType[]>([]);
  const [disliked, setDisliked] = useState<CardType[]>([]);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const current = MOCK_PROPERTIES[index];
  const done = index >= MOCK_PROPERTIES.length;

  const buildProfile = useCallback(
    (likedCards: CardType[], dislikedCards: CardType[]): SwipeProfile => {
      const all = [...likedCards, ...dislikedCards];
      if (all.length === 0) {
        return {
          price_sensitivity: 0.5,
          size_preference: 0.5,
          school_importance: 0.5,
          commute_tolerance: 0.5,
          stretch_behavior: 0.5,
        };
      }
      const medPrice = median(all.map((p) => p.price));
      const likedPrices = likedCards.map((p) => p.price);
      const avgLikedPrice =
        likedPrices.length > 0
          ? likedPrices.reduce((a, b) => a + b, 0) / likedPrices.length
          : medPrice;

      const likedSqft = likedCards.map((p) => p.sqft);
      const avgSqft =
        likedSqft.length > 0
          ? likedSqft.reduce((a, b) => a + b, 0) / likedSqft.length
          : 1500;

      const likedSchool = likedCards.map((p) => p.school_score);
      const avgSchool =
        likedSchool.length > 0
          ? likedSchool.reduce((a, b) => a + b, 0) / likedSchool.length
          : 7;

      const likedCommute = likedCards.map((p) => p.commute_minutes);
      const avgCommute =
        likedCommute.length > 0
          ? likedCommute.reduce((a, b) => a + b, 0) / likedCommute.length
          : 20;

      const stretch =
        likedPrices.length > 0
          ? likedPrices.filter((p) => p > medPrice).length / likedPrices.length
          : 0.5;

      return {
        price_sensitivity: Math.min(1, Math.max(0, 1 - avgLikedPrice / (medPrice * 2))),
        size_preference: Math.min(1, avgSqft / 3000),
        school_importance: avgSchool / 10,
        commute_tolerance: Math.min(1, avgCommute / 40),
        stretch_behavior: stretch,
      };
    },
    []
  );

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (done) return;
      setExiting(direction);

      const newLiked = direction === "right" ? [...liked, current] : liked;
      const newDisliked = direction === "left" ? [...disliked, current] : disliked;

      if (direction === "right") setLiked(newLiked);
      else setDisliked(newDisliked);

      setTimeout(() => {
        setExiting(null);
        x.set(0);
        const nextIdx = index + 1;
        setIndex(nextIdx);

        if (nextIdx >= MOCK_PROPERTIES.length) {
          const profile = buildProfile(newLiked, newDisliked);
          navigate("/quiz", { state: { swipeProfile: profile } });
        }
      }, 300);
    },
    [index, done, current, liked, disliked, navigate, buildProfile, x]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const threshold = 100;
      if (info.offset.x > threshold || info.velocity.x > 500) {
        animate(x, 400, { duration: 0.3 });
        handleSwipe("right");
      } else if (info.offset.x < -threshold || info.velocity.x < -500) {
        animate(x, -400, { duration: 0.3 });
        handleSwipe("left");
      } else {
        animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
      }
    },
    [handleSwipe, x]
  );

  if (done) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-8 pb-12">
      <h1 className="text-3xl font-bold text-primary mb-1">Find your style</h1>
      <p className="text-secondary text-sm mb-6">
        Swipe right on homes you love, left to pass
      </p>

      <ProgressBar step={index} total={MOCK_PROPERTIES.length} />

      <div className="relative w-full max-w-sm h-[440px]">
        {/* Next card underneath */}
        {index + 1 < MOCK_PROPERTIES.length && (
          <div className="absolute inset-0 flex items-center justify-center scale-95 opacity-50">
            <PropertyCard property={MOCK_PROPERTIES[index + 1]} />
          </div>
        )}

        <motion.div
          className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ x, rotate }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragEnd={handleDragEnd}
          animate={
            exiting === "left"
              ? { x: -500, opacity: 0 }
              : exiting === "right"
                ? { x: 500, opacity: 0 }
                : {}
          }
          transition={{ duration: 0.3 }}
        >
          {/* Like / Nope overlays */}
          <motion.div
            className="absolute top-8 right-8 z-10 bg-green-500/90 text-white text-lg font-bold px-4 py-1 rounded-lg border-2 border-green-400 rotate-12"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </motion.div>
          <motion.div
            className="absolute top-8 left-8 z-10 bg-red-500/90 text-white text-lg font-bold px-4 py-1 rounded-lg border-2 border-red-400 -rotate-12"
            style={{ opacity: nopeOpacity }}
          >
            NOPE
          </motion.div>

          <PropertyCard property={current} />
        </motion.div>
      </div>

      <div className="flex gap-6 mt-8">
        <button
          onClick={() => {
            animate(x, -400, { duration: 0.25 });
            handleSwipe("left");
          }}
          className="w-14 h-14 rounded-full bg-base-2 border border-red-400/40 flex items-center justify-center text-red-400 hover:bg-red-400/10 transition"
        >
          <ThumbsDown size={22} />
        </button>
        <button
          onClick={() => {
            animate(x, 400, { duration: 0.25 });
            handleSwipe("right");
          }}
          className="w-14 h-14 rounded-full bg-base-2 border border-green-400/40 flex items-center justify-center text-green-400 hover:bg-green-400/10 transition"
        >
          <ThumbsUp size={22} />
        </button>
      </div>

      <p className="text-secondary/50 text-xs mt-4">
        {index + 1} / {MOCK_PROPERTIES.length}
      </p>
    </div>
  );
}
