import { useEffect, useState } from 'react';
import MarkListView from '../MarkListView/MarkListView';
import { fetchKGConfig } from '../../utils/kgApi';

export default function KGMarkList() {
  const [termCount, setTermCount] = useState(2);

  useEffect(() => {
    let alive = true;
    fetchKGConfig()
      .then((cfg) => { if (alive) setTermCount(cfg.term_count); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return <MarkListView kgOnly termCountOverride={termCount} />;
}
