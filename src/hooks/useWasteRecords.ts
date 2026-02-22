import { useDataContext } from '../contexts/DataContext';

export function useWasteRecords() {
    const { records, recordsLoading, addRecord, deleteRecord, filterRecords } = useDataContext();
    return { records, loading: recordsLoading, addRecord, deleteRecord, filterRecords };
}
