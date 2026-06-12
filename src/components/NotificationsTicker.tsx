import { useEffect, useState, useRef } from "react";
import {
  db,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "../lib/firebase";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function NotificationsTicker() {
  const [activeNotification, setActiveNotification] = useState<any | null>(
    null,
  );
  const lastSeenIdRef = useRef<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(1),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const latestDoc = snapshot.docs[0];
          const latestId = latestDoc.id;
          const latestData = { id: latestId, ...latestDoc.data() };

          // Show only if this is a newly received notification ID
          if (lastSeenIdRef.current !== latestId) {
            lastSeenIdRef.current = latestId;
            setActiveNotification(latestData);

            // Hide after 5 seconds
            const timer = setTimeout(() => {
              setActiveNotification(null);
            }, 5000);

            return () => {
              clearTimeout(timer);
            };
          }
        }
      },
      (err) => console.error(err),
    );
    return () => unsubscribe();
  }, []);

  return (
    <AnimatePresence>
      {activeNotification && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#009c3b] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium whitespace-nowrap overflow-hidden max-w-[90vw]"
        >
          <Bell className="w-4 h-4 shrink-0" />
          <span className="truncate">{activeNotification.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
