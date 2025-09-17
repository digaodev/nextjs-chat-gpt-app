"use client";

import { Message } from "@/types";
import { useEffect, useRef } from "react";

const truncateText = (str: string, length: number) =>
  str.length > length ? str.slice(0, length) + "..." : str;

export default function Transcript({
  messages,
  truncate = true,
}: {
  messages: Message[];
  truncate?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // scroll to bottom when messages change
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div ref={listRef} className="flex flex-col gap-2">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex flex-col ${
            message.role === "user" ? "items-end" : "items-start"
          }`}
        >
          <div
            className={`${
              message.role === "user" ? "bg-blue-500" : "bg-gray-500 text-black"
            } rounded-md py-2 px-8`}
          >
            {truncate ? truncateText(message.content, 200) : message.content}
          </div>
        </div>
      ))}
    </div>
  );
}
