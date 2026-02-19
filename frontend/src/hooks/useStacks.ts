import { useState, useCallback, useEffect } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { createNetwork, getProfileAddress } from '@/config/network';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export function useStacks() {
    const [userData, setUserData] = useState(
        userSession.isUserSignedIn() ? userSession.loadUserData() : null
    );
    const [network] = useState(() => createNetwork());

    useEffect(() => {
        if (userSession.isSignInPending()) {
            userSession.handlePendingSignIn().then((data) => {
                setUserData(data);
            });
        }
    }, []);

    const connect = useCallback(() => {
        showConnect({
            appDetails: {
                name: 'Solve-Earn',
                icon: window.location.origin + '/logo.png',
            },
            redirectTo: '/',
            onFinish: () => {
                const data = userSession.loadUserData();
                setUserData(data);
            },
            userSession,
        });
    }, []);

    const disconnect = useCallback(() => {
        userSession.signUserOut();
        setUserData(null);
        window.location.href = '/';
    }, []);

    return {
        userData,
        connect,
        disconnect,
        userSession,
        network,
        isConnected: !!userData,
        address: userData ? getProfileAddress(userData.profile) : '',
    };
}
