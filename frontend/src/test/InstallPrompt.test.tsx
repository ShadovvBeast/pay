import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallPrompt } from '../components/InstallPrompt';
import * as usePWAModule from '../hooks/usePWA';

// Mock the usePWA hook
vi.mock('../hooks/usePWA');

describe('InstallPrompt Component', () => {
  const mockUsePWA = usePWAModule.usePWA as any;
  const mockInstallApp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePWA.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      installApp: mockInstallApp,
    });
  });

  it('should not render when cannot install', () => {
    mockUsePWA.mockReturnValue({
      canInstall: false,
      isInstalled: false,
      installApp: mockInstallApp,
    });

    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when already installed', () => {
    mockUsePWA.mockReturnValue({
      canInstall: true,
      isInstalled: true,
      installApp: mockInstallApp,
    });

    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should render install prompt when can install', () => {
    render(<InstallPrompt />);
    
    expect(screen.getByText('Install SB0 Pay')).toBeInTheDocument();
    expect(screen.getByText('Install the app for faster access and offline capability')).toBeInTheDocument();
    expect(screen.getByText('Install')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
  });

  it('should call installApp when install button is clicked', async () => {
    mockInstallApp.mockResolvedValue(true);
    
    render(<InstallPrompt />);
    
    const installButton = screen.getByText('Install');
    fireEvent.click(installButton);
    
    expect(mockInstallApp).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(screen.getByText('Installing...')).toBeInTheDocument();
    });
  });

  it('should dismiss prompt when later button is clicked', () => {
    const { container } = render(<InstallPrompt />);
    
    const laterButton = screen.getByText('Later');
    fireEvent.click(laterButton);
    
    expect(container.firstChild).toBeNull();
  });
});