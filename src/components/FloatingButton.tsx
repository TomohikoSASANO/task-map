import React from 'react'

interface FloatingButtonProps {
    onClick: () => void
    isOpen: boolean
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({ onClick, isOpen }) => {
    return (
        <button
            type="button"
            className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg z-30 flex items-center justify-center transition-transform duration-200 ${
                isOpen ? 'rotate-45' : ''
            }`}
            onClick={onClick}
            aria-label="パレットを開く"
        >
            <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                />
            </svg>
        </button>
    )
}
