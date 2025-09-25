import React from 'react';

const Testimonials = () => {
  const testimonials = [
    {
      quote: "This platform gave me instant verification for my job application abroad. It's a game-changer for students!",
      name: 'Priya Sharma',
      role: 'Student',
      avatar: 'https://i.pravatar.cc/150?u=priya',
    },
    {
      quote: 'Saved us from hiring risks – we can now trust verified degrees. The process is seamless and efficient.',
      name: 'Rohit Singh',
      role: 'Recruiter',
      avatar: 'https://i.pravatar.cc/150?u=rohit',
    },
    {
      quote: "As a university administrator, I can now ensure all student certificates are verified quickly. It saves us so much time!",
      name: 'Anita Mehra',
      role: 'University Admin',
      avatar: 'https://i.pravatar.cc/150?u=anita',
    },
  ];

  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Trusted by Students and Recruiters</h2>
          <p className="mt-4 text-lg text-gray-500">Don't just take our word for it. Here's what people are saying.</p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-white rounded-xl p-8 border border-gray-200 shadow-md transition-transform transform hover:-translate-y-2 hover:shadow-xl duration-300"
            >
              <blockquote className="text-lg text-gray-700 relative">
                <span className="absolute -top-4 -left-4 text-blue-600 text-3xl">“</span>
                <p className="ml-4">{testimonial.quote}</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center">
                <img
                  className="h-12 w-12 rounded-full border-2 border-blue-600"
                  src={testimonial.avatar}
                  alt={testimonial.name}
                />
                <div className="ml-4">
                  <div className="text-base font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </figcaption>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
