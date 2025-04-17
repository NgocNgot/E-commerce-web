"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const banners = [
    "http://localhost:1337/uploads/banner_1_71b4632f49.png",
    "http://localhost:1337/uploads/banner_2_e9e7f8d4bb.png",
];

export default function Header() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prevIndex) => (prevIndex + 1) % banners.length);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-120 overflow-hidden mt-16">
            <AnimatePresence mode="wait">
                <motion.div
                    key={banners[index]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                >
                    <Image
                        src={banners[index]}
                        alt="Banner"
                        layout="fill"
                        objectFit="cover"
                        className="opacity-80"
                    />
                </motion.div>
            </AnimatePresence>
            <button className="absolute left-65 bottom-18 text-base drop-shadow-lg px-6 py-3 bg-rose-400 text-white hover:bg-rose-500 transition">
                SHOP NOW
            </button>
        </div>
    );
}
