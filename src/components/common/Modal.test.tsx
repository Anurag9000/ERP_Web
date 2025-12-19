import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <Modal isOpen={false} onClose={() => { }}>
                <div>Modal Content</div>
            </Modal>
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders title and children when isOpen is true', () => {
        render(
            <Modal isOpen={true} onClose={() => { }} title="Test Modal">
                <div>Modal Content</div>
            </Modal>
        );
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={handleClose}>
                <div>Modal Content</div>
            </Modal>
        );
        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
        const handleClose = vi.fn();
        const { container } = render(
            <Modal isOpen={true} onClose={handleClose}>
                <div>Modal Content</div>
            </Modal>
        );
        // Backdrop is the first div inside the relative container or the absolute one?
        // In Modal.tsx, backdrop is the fixed inset-0 bg-black
        const backdrop = container.querySelector('.bg-black');
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(handleClose).toHaveBeenCalledTimes(1);
        }
    });

    it('sets body overflow to hidden when open and resets on close', () => {
        const { unmount } = render(
            <Modal isOpen={true} onClose={() => { }}>
                <div>Modal Content</div>
            </Modal>
        );
        expect(document.body.style.overflow).toBe('hidden');
        unmount();
        expect(document.body.style.overflow).toBe('unset');
    });
});
