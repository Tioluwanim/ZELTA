"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowBigUp, Brain, LucideIcon, Target } from "lucide-react";
import Button from "./Button";
// import Auth from "../app/auth/page";
interface Intro {
  id: string;
  icon: LucideIcon;
  heading: string;
  details: string;
  buttonText: string;
}

const intro: Intro[] = [
  {
    id: "1",
    icon: Brain,
    heading: "Market Emotion with Bayse",
    details:
      "Bayse measures emotional market behavior and crowd panic patterns, so you can decide with more clarity.",
    buttonText: "Next",
  },
  {
    id: "2",
    icon: ArrowBigUp,
    heading: "Market Panic Level Guidance",
    details:
      "Know when emotion is high. We show when to slow down, hold cash, or act with caution.",
    buttonText: "Next",
  },
  {
    id: "3",
    icon: Target,
    heading: "Clear Weekly Recommendation",
    details:
      "Get plain-English guidance on what to do this week, how much to allocate, and why it fits your risk level.",
    buttonText: "Get Started",
  },
];

export default function Home() {
  const navigate = useRouter();
  const [activeTab, setActiveTab] = useState(intro[0].id);

  //   derived states
  const current = intro.find((tab) => tab.id === activeTab);
  const currentIndex = intro.findIndex((tab) => tab.id === activeTab);
  // const currentButtonText = intro.filter(
  //   (tab) => tab.buttonText === "Get Started",
  // );

  const handleButtonClick = () => {
    if (currentIndex < intro.length - 1) {
      setActiveTab(intro[currentIndex + 1].id);
    }
    if (current?.buttonText === "Get Started") {
      navigate.push("/login");
    }
  };

  return (
    <div className="space-y-6 h-screen flex items-center justify-center">
      <div className="rounded-xl max-w-180 p-6 text-center flex flex-col justify-center items-center ">
        {current && (
          <>
            <current.icon className="h-10 w-10 stroke-1 text-green-600" />
            <h2 className="mt-4 text-[18px] lg:text-[22px] max-w-80 font-bold">
              {current.heading}
            </h2>
            <p className="mt-2 text-zinc-600 text-[12px] max-w-90">
              {current.details}
            </p>

            <Button
              onClick={handleButtonClick}
              className="mt-6 rounded-xl w-[80%] bg-[#0b825a] text-white px-8 py-2 hover:bg-[#0a6f4d] text-[14px]"
            >
              {current.buttonText}
            </Button>

            <Button
              className="mt-2 rounded-xl w-[80%]  hover:bg-orange-400 px-8 py-2 cursor-pointer text-[14px]"
              onClick={() => {
                navigate.push("/login");
              }}
            >
              Skip
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
