import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileButton } from '../components/MobileButton';
import * as useMobileModule from '../hooks/useMobile';

// Mock the useMobile hook
vi.mock('../hooks/useMobile');

describe('MobileButton Component', () => {
  const mockUseMobile = useMobileModule.useMobile as any;
  const mockHapticFeedback = vi.fn();
  const mockAddTouchOptimization = vi.fn();
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMobile.mockReturnValue({
      hapticFeedback: mockHapticFeedback,
      addTouchOptimization: mockAddTouchOptimization,
      features: {
        hasHapticFeedback: true,
        isTouchDevice: true,
      },
    });
  });

  it('should render button with children', () => {
    render(
      <MobileButton onClick={mockOnClick}>
        Test Button
      </MobileButton>
    );

    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('should call onClick and provide haptic feedback', async () => {
    render(
      <MobileButton onClick={mockOnClick}>
        Test Button
      </MobileButton>
    );

    const button = screen.getByText('Test Button');
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalled();
    expect(mockHapticFeedback).toHaveBeenCalledWith('success');
  });

  it('should not call onClick when disabled', () => {
    render(
      <MobileButton onClick={mockOnClick} disabled>
        Test Button
      </MobileButton>
    );

    const button = screen.getByText('Test Button');
    fireEvent.click(button);

    expect(mockOnClick).not.toHaveBeenCalled();
    expect(mockHapticFeedback).not.toHaveBeenCalled();
  });

  it('should apply correct variant classes', () => {
    render(
      <MobileButton onClick={mockOnClick} variant="success">
        Success Button
      </MobileButton>
    );

    const button = screen.getByText('Success Button');
    expect(button).toHaveClass('bg-green-600');
  });

  it('should apply correct size classes', () => {
    render(
      <MobileButton onClick={mockOnClick} size="lg">
        Large Button
      </MobileButton>
    );

    const button = screen.getByText('Large Button');
    expect(button).toHaveClass('px-6', 'py-4', 'text-lg');
  });

  it('should use custom haptic type', async () => {
    render(
      <MobileButton onClick={mockOnClick} hapticType="error">
        Error Button
      </MobileButton>
    );

    const button = screen.getByText('Error Button');
    fireEvent.click(button);

    expect(mockHapticFeedback).toHaveBeenCalledWith('error');
  });
});