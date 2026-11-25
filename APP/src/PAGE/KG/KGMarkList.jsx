import { useEffect, useState } from 'react';
import MarkListView from '../MarkListView/MarkListView';
import { fetchKGConfig, DEFAULT_GRADE_BANDS } from '../../utils/kgApi';

export default function KGMarkList() {
  const [termCount, setTermCount] = useState(2);
  const [gradeBands, setGradeBands] = useState(DEFAULT_GRADE_BANDS);
  const [rankDisplay, setRankDisplay] = useState('grade');
  const [passMark, setPassMark] = useState(50);

  useEffect(() => {
    let alive = true;
    fetchKGConfig()
      .then((cfg) => {
        if (!alive) return;
        setTermCount(cfg.term_count);
        setGradeBands(cfg.grade_bands);
        setRankDisplay(cfg.rank_display);
        setPassMark(cfg.pass_mark);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <MarkListView
      kgOnly
      termCountOverride={termCount}
      gradeBands={gradeBands}
      rankDisplayOverride={rankDisplay}
      passMarkOverride={passMark}
    />
  );
}
