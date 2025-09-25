import React, { useEffect, useState, useRef } from "react";

const AnimatedStat = ({ value, duration = 2000, suffix = "", start = false }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;

    let startValue = 0;
    const step = value / (duration / 16); // roughly 60fps
    const timer = setInterval(() => {
      startValue += step;
      if (startValue >= value) {
        startValue = value;
        clearInterval(timer);
      }
      setCount(Number.isInteger(value) ? Math.round(startValue) : startValue.toFixed(1));
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration, start]);

  return (
    <span className="inline-block transition-transform duration-300 ease-out transform hover:scale-105">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

export default function Stats() {
  const statsRef = useRef(null);
  const [inView, setInView] = useState(false);

  const stats = [
    { id: 1, name: "Institutions Onboarded", value: 200, suffix: "+" },
    { id: 2, name: "Certificates Verified", value: 900000, suffix: "+" },
    { id: 3, name: "Verification Accuracy", value: 99.9, suffix: "%" },
    { id: 4, name: "Reduction in Fraud", value: 90, suffix: "%" },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // only trigger once
        }
      },
      { threshold: 0.3 } // 30% of element is visible
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={statsRef}
      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
            Trusted by the Numbers
          </h2>
          <p className="mt-4 text-xl text-blue-200">
            Our platform is making a real impact in the education ecosystem.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <div
              key={stat.id}
              className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-lg hover:scale-105 transform transition duration-300"
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <dd className="text-5xl font-extrabold text-white">
                <AnimatedStat value={stat.value} suffix={stat.suffix} start={inView} />
              </dd>
              <dt className="mt-2 text-lg font-medium text-blue-200">
                {stat.name}
              </dt>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
