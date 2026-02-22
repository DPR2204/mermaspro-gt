import { useDataContext } from '../contexts/DataContext';

export function useAppConfig() {
    const { config, configLoading, updateConfig } = useDataContext();
    return { config, loading: configLoading, updateConfig };
}
