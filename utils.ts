
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => reject(error)
    );
  });
};

export const getHealthTip = (): string => {
  const tips = [
    "Stay hydrated! Aim for 8 glasses of water a day.",
    "Try to get at least 30 minutes of light exercise today.",
    "Always complete your full course of antibiotics, even if you feel better.",
    "Store medicines in a cool, dry place away from direct sunlight.",
    "Take your medicines at the same time every day to build a habit.",
    "A balanced diet rich in greens boosts your immunity naturally.",
    "Prioritize 7-8 hours of sleep for better physical and mental health."
  ];
  return tips[Math.floor(Math.random() * tips.length)];
};
