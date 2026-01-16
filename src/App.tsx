import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SolventPrintersPage from "./components/SolventPrinters";
import ScrollToTop from "./components/ScrollToTop";
import UVPrintersPage from "./components/UVPrinters";
import LaserCuttingMachinesPage from "./components/LaserCuttingMachines";
import LaminationMachinesPage from "./components/LaminationMachines";
import DesktopUVPrinterPage from "./components/DesktopUVPrinter";
import InkjetPrintersPage from "./components/InkjetPrinters";
import UVFlatbedPrinterPage from "./components/UVFlatbedPrinter";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="elkatech-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/solvent-printers" element={<SolventPrintersPage />} />
            <Route path="/uv-printers" element={<UVPrintersPage />} />
            <Route path="/laser-cutting-machines" element={<LaserCuttingMachinesPage />} />
            <Route path="/lamination-machines" element={<LaminationMachinesPage />} />
            <Route path="/desktop-uv-printer" element={<DesktopUVPrinterPage />} />
            <Route path="/inject-printer" element={<InkjetPrintersPage />} />
            <Route path="/flatbed-uv-printer" element={<UVFlatbedPrinterPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
