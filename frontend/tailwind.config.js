module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        ccap: {
          navy: "#173B2F",
          blue: "#2E7D32",
          steel: "#5F6B63",
          mist: "#F5F7FA",
          line: "#E5E7EB",
          green: "#4CAF50",
          amber: "#FBC02D",
          critical: "#D32F2F"
        }
      },
      boxShadow: {
        panel: "0 8px 24px rgba(15, 39, 66, 0.08)"
      }
    }
  },
  plugins: []
};
