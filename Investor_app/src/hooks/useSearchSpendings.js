import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

/**
 * useSearchSpendings hook
 * Handles paginated searching of spendings for a specific project.
 */
export const useSearchSpendings = (projectId, initialLimit = 20) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    const debounceTimer = useRef(null);

    const performSearch = useCallback(async (query, pageNum, append = false) => {
        if (!projectId) return;

        setIsLoading(true);
        try {
            const data = await api.searchSpendings(projectId, {
                search: query,
                page: pageNum,
                limit: initialLimit,
            });

            if (append) {
                setResults(prev => [...prev, ...(data.spendings || [])]);
            } else {
                setResults(data.spendings || []);
            }

            setTotal(data.total || 0);
            setHasMore(data.hasMore || false);
            setPage(pageNum);
        } catch (error) {
            console.error('[useSearchSpendings] Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, initialLimit]);

    // Initial load and search on query change
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            setPage(1);
            performSearch(searchQuery, 1, false);
        }, 500); // 500ms debounce

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [searchQuery, performSearch]);

    const loadMore = useCallback(() => {
        if (hasMore && !isLoading) {
            performSearch(searchQuery, page + 1, true);
        }
    }, [hasMore, isLoading, searchQuery, page, performSearch]);

    const refresh = useCallback(() => {
        setPage(1);
        performSearch(searchQuery, 1, false);
    }, [searchQuery, performSearch]);

    return {
        searchQuery,
        setSearchQuery,
        results,
        isLoading,
        hasMore,
        total,
        loadMore,
        refresh,
    };
};
