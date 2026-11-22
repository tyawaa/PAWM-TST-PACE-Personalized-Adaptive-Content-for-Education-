import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import * as Api from '../services/ApiService';

/** @returns {import('../types').LearningLoad} */
export function useLearningData() {
  const { session } = useAuth();
  const [data, setData] = useState(/** @type {import('../types').LearningData | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!session) return;
      setLoading(true);
      setError(null);
      Promise.all([
        Api.getConcepts(session.access_token),
        Api.getProgress(session.access_token),
        Api.getRecommendations(session.access_token),
      ])
        .then(([concepts, progress, recommendations]) => {
          if (active) setData({ concepts, progress, recommendations });
        })
        .catch((failure) => {
          if (active) {
            setData(null);
            setError(Api.errorMessage(failure));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [session, revision]),
  );

  return { data, loading, error, refresh };
}
