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
    heading: "Intelligence from Bayse Markets",
    details:
      " We analyze crowd behavior and market signals to give you real-time financial intelligence—no guessing, just data..",
    buttonText: "Next",
  },
  {
    id: "2",
    icon: ArrowBigUp,
    heading: "Stress Index & Bayesian Reasoning",
    details:
      " Know when you're making emotional decisions. Our Stress Index tracks your behavior and corrects it with probabilistic reasoning.",
    buttonText: "Next",
  },
  {
    id: "3",
    icon: Target,
    heading: "Kelly-Style Decisions ",
    details:
      " Get plain-English verdicts on how much to allocate, when to act, and why—tailored to your goals and risk tolerance..",
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
      navigate.push("/auth");
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
              className="mt-6 rounded-xl w-[80%] bg-green-800 text-white px-8 py-2 hover:bg-green-900 text-[14px]"
            >
              {current.buttonText}
            </Button>

            <Button
              className="mt-2 rounded-xl w-[80%]  hover:bg-orange-400 px-8 py-2 cursor-pointer text-[14px]"
              onClick={() => {
                navigate.push("/auth");
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
