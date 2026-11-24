import { useEffect, useState } from 'react';
import MarkListManagement from '../CreateMarklist/MarkListManagement';
import { fetchKGConfig } from '../../utils/kgApi';

export default function KGCreateMarkList() {
  const [termCount, setTermCount] = useState(2);

  useEffect(() => {
    let alive = true;
    fetchKGConfig()
      .then((cfg) => { if (alive) setTermCount(cfg.term_count); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <MarkListManagement
      kgOnly
      initialTab="forms"
      termCountOverride={termCount}
    />
  );
}
