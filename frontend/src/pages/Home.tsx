import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import ApiSection from "../components/landing/ApiSection";
import PricingSection from "../components/landing/PricingSection";
import Footer from "../components/landing/Footer";

export const Home = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <h1 className="sr-only">SB0 Pay — accept payments with a QR code</h1>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ApiSection />
      <PricingSection />
      <Footer />
    </main>
  );
};

export default Home;
