import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAStatusProps {
    className?: string;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({ className = '' }) => {
    const isOnline = useOnlineStatus();
    const { isInstalled } = usePWAInstall();

    return (
        <div className={`flex items-center space-x-2 text-sm ${className}`}>
            {/* Online/Offline Status */}
            <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={isOnline ? 'text-green-700' : 'text-red-700'}>
                    {isOnline ? 'Online' : 'Offline'}
                </span>
            </div>

            {/* PWA Install Status */}
            {isInstalled && (
                <div className="flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-blue-700">App Installed</span>
                </div>
            )}
        </div>
    );
};