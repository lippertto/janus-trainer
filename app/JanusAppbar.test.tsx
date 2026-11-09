/**
 * @vitest-environment jsdom
 */
import 'cross-fetch/polyfill';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import JanusAppbar from '@/app/JanusAppbar';

const pathnameMock = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/app/JanusDrawer', () => ({ default: () => <div>drawer</div> }));
vi.mock('@/app/HelpButton', () => ({ default: () => <div>help</div> }));

describe('JanusAppbar', () => {
  afterEach(cleanup);

  test('is hidden on /login', () => {
    pathnameMock.mockReturnValue('/login');
    const { container } = render(<JanusAppbar />);
    expect(container).toBeEmptyDOMElement();
  });

  test('is shown on other pages', () => {
    pathnameMock.mockReturnValue('/enter');
    render(<JanusAppbar />);
    expect(screen.getByText('Janus Abrechnungs-App')).toBeInTheDocument();
    expect(screen.getByText('drawer')).toBeInTheDocument();
  });
});
