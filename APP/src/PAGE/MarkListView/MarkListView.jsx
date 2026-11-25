// MarkListView.jsx - V2 Mark Lists
import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Search,
  Trophy,
  Users,
  XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './MarkListView.module.css';

import Button from '../../COMPONENTS/Button/Button';
import Input from '../../COMPONENTS/Input/Input';
import Select from '../../COMPONENTS/Select/Select';
import Card from '../../COMPONENTS/Card/Card';
import StatCard from '../../COMPONENTS/StatCard/StatCard';
import { DEFAULT_GRADE_BANDS, gradeForMark, rankDisplayLabel } from '../../utils/kgApi';

const API_BASE_URL = (typeof window !== 'undefined' && window.location.origin ? window.location.origin + '/api' : (import.meta.env.VITE_API_URL || '/api'));

const MarkListView = ({
  kgOnly = false,
  termCountOverride = null,
  gradeBands = null,
  rankDisplayOverride = null,
  passMarkOverride = null,
} = {}) => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [markConfig, setMarkConfig] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [termCount, setTermCount] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [passMark, setPassMark] = useState(50);
  const [passMarkInput, setPassMarkInput] = useState('50');
  const [passMarkSaving, setPassMarkSaving] = useState(false);
  const [passMarkVersion, setPassMarkVersion] = useState(0);
  const [viewMode, setViewMode] = useState('ranking'); // 'subject' or 'ranking'
  const [rankingData, setRankingData] = useState(null);
  const [allTermsData, setAllTermsData] = useState(null);
  const [loadingAllTerms, setLoadingAllTerms] = useState(false);
  const markListRef = useRef(null);

  // Fetch available classes and config
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [classesRes, configRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/mark-list/classes`),
          axios.get(`${API_BASE_URL}/mark-list/config`),
        ]);
        const tc = parseInt(termCountOverride || configRes.data?.term_count || configRes.data?.terms, 10) || 2;
        setTermCount(tc);
        const rawClasses = classesRes.data;
        const allClasses = Array.isArray(rawClasses) ? rawClasses : (rawClasses?.classes || []);
        const classList = kgOnly
          ? allClasses.filter((c) => /^KG/i.test(String(typeof c === 'object' && c !== null ? (c.class_name || c.name || c.id) : c)))
          : allClasses;
        setClasses(classList);
        if (classList.length > 0) {
          const firstVal = typeof classList[0] === 'object' && classList[0] !== null
            ? (classList[0].class_name || classList[0].name || classList[0].id)
            : classList[0];
          setSelectedClass(firstVal);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [kgOnly, termCountOverride]);

  // Fetch subjects when class changes
  useEffect(() => {
    if (!selectedClass) return;
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/mark-list/subjects-classes`);
        const classSubjects = response.data?.filter((m) => String(m.class_name).toLowerCase() === String(selectedClass).toLowerCase()) || [];
        setSubjects(classSubjects);
        if (classSubjects.length > 0) {
          setSelectedSubject(classSubjects[0].subject_name);
        } else {
          setSelectedSubject('');
          setStudents([]);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
      }
    };
    fetchSubjects();
  }, [selectedClass]);

  // Fetch marks for single subject view
  useEffect(() => {
    if (!selectedClass || !selectedSubject || !selectedTerm || selectedTerm === 'all' || viewMode !== 'subject') return;
    const fetchMarks = async () => {
      setLoadingMarks(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/mark-list/mark-list/${selectedSubject}/${selectedClass}/${selectedTerm}`
        );
        setStudents(response.data.markList || []);
        setMarkConfig(response.data.config || null);
      } catch (error) {
        console.error('Error fetching marks:', error);
        setStudents([]);
        setMarkConfig(null);
      } finally {
        setLoadingMarks(false);
      }
    };
    fetchMarks();
  }, [selectedClass, selectedSubject, selectedTerm, viewMode, passMarkVersion]);

  // Pass mark for the selected class + term (normal classes can edit it here)
  useEffect(() => {
    if (!selectedClass || !selectedTerm || selectedTerm === 'all') return;
    let alive = true;
    axios
      .get(`${API_BASE_URL}/mark-list/pass-mark`, {
        params: {
          className: selectedClass,
          termNumber: selectedTerm,
          ...(viewMode === 'subject' && selectedSubject ? { subjectName: selectedSubject } : {}),
        },
      })
      .then((r) => {
        if (!alive) return;
        const value = Number(r.data?.passMark);
        if (Number.isFinite(value)) {
          setPassMark(value);
          setPassMarkInput(String(value));
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [selectedClass, selectedSubject, selectedTerm, viewMode, passMarkVersion]);

  // Build ranking client-side by fetching each subject's marks
  useEffect(() => {
    if (!selectedClass || !selectedTerm || selectedTerm === 'all' || viewMode !== 'ranking' || subjects.length === 0) return;
    const fetchRanking = async () => {
      setLoadingMarks(true);
      try {
        // Fetch marks for all subjects in parallel
        const results = await Promise.all(
          subjects.map((sub) =>
            axios
              .get(`${API_BASE_URL}/mark-list/mark-list/${encodeURIComponent(sub.subject_name)}/${encodeURIComponent(selectedClass)}/${selectedTerm}`)
              .then((r) => ({ subject: sub.subject_name, data: r.data }))
              .catch(() => ({ subject: sub.subject_name, data: null }))
          )
        );

        const studentMap = {};
        const subjectNames = [];

        for (const { subject, data } of results) {
          if (!data?.markList?.length) continue;
          subjectNames.push(subject);
          for (const row of data.markList) {
            const name = row.student_name;
            if (!studentMap[name]) {
              studentMap[name] = { studentName: name, subjects: {}, totalMarks: 0, subjectCount: 0, passedSubjects: 0, failedSubjects: 0 };
            }
            const total = Math.min(row.total || 0, 100);
            studentMap[name].subjects[subject] = { total, status: row.pass_status || 'Fail' };
            studentMap[name].totalMarks += total;
            studentMap[name].subjectCount++;
            row.pass_status === 'Pass' ? studentMap[name].passedSubjects++ : studentMap[name].failedSubjects++;
          }
        }

        const rankings = Object.values(studentMap)
          .map((s) => ({
            ...s,
            average: s.subjectCount > 0 ? s.totalMarks / s.subjectCount : 0,
            overallStatus: s.failedSubjects === 0 && s.subjectCount > 0 ? 'Pass' : 'Fail',
          }))
          .sort((a, b) => b.average - a.average)
          .map((s, i) => ({ ...s, rank: i + 1 }));

        setRankingData({
          rankings,
          subjects: subjectNames,
          summary: {
            totalStudents: rankings.length,
            averageClassScore: rankings.length > 0 ? rankings.reduce((sum, s) => sum + s.average, 0) / rankings.length : 0,
            passRate: rankings.length > 0 ? (rankings.filter((s) => s.overallStatus === 'Pass').length / rankings.length) * 100 : 0,
          },
        });
      } catch (error) {
        console.error('Error building ranking:', error);
        setRankingData(null);
      } finally {
        setLoadingMarks(false);
      }
    };
    fetchRanking();
  }, [selectedClass, selectedTerm, viewMode, subjects, passMarkVersion]);

  // "All Terms": consolidated totals/averages/ranks per term + final rank
  useEffect(() => {
    if (selectedTerm !== 'all' || !selectedClass) {
      setAllTermsData(null);
      return;
    }
    let alive = true;
    setLoadingAllTerms(true);
    axios
      .get(`${API_BASE_URL}/mark-list/full-ranking/${encodeURIComponent(selectedClass)}`)
      .then((r) => { if (alive) setAllTermsData(r.data || null); })
      .catch((err) => {
        console.error('Error fetching all-term rankings:', err);
        if (alive) setAllTermsData(null);
      })
      .finally(() => { if (alive) setLoadingAllTerms(false); });
    return () => { alive = false; };
  }, [selectedClass, selectedTerm, passMarkVersion]);

  const allTermsSummary = useMemo(() => {
    if (!allTermsData?.terms?.length) return null;
    const terms = allTermsData.terms || [];
    let subjects = Array.isArray(allTermsData.allSubjects) ? [...allTermsData.allSubjects] : [];
    if (subjects.length === 0) {
      const set = new Set();
      for (const term of terms) {
        for (const st of term.rankings || []) {
          Object.keys(st.subjects || {}).forEach((s) => set.add(s));
        }
      }
      subjects = [...set].sort((a, b) => a.localeCompare(b));
    }
    const byStudent = new Map();

    for (const term of terms) {
      for (const st of term.rankings || []) {
        const key = String(st.studentName || '').trim().toLowerCase();
        if (!key) continue;
        if (!byStudent.has(key)) {
          byStudent.set(key, { studentName: st.studentName, perTerm: {} });
        }
        byStudent.get(key).perTerm[term.termNumber] = {
          total: Number(st.totalMarks) || 0,
          average: Number(st.average) || 0,
          rank: st.rank,
          subjectCount: Number(st.subjectCount) || 0,
          status: st.overallStatus || 'Fail',
          subjects: st.subjects || {},
        };
      }
    }

    const rows = [...byStudent.values()].map((row) => {
      let grandTotal = 0;
      let grandCount = 0;
      let hasData = false;
      let allPass = true;
      for (const term of terms) {
        const t = row.perTerm[term.termNumber];
        if (!t) continue;
        hasData = true;
        grandTotal += t.total;
        grandCount += t.subjectCount;
        if (t.status !== 'Pass') allPass = false;
      }
      const average = grandCount > 0 ? grandTotal / grandCount : 0;
      return {
        ...row,
        grandTotal,
        average,
        status: hasData ? (allPass ? 'Pass' : 'Fail') : 'Fail',
      };
    });

    rows.sort((a, b) => (b.average - a.average) || (b.grandTotal - a.grandTotal));
    rows.forEach((row, index) => { row.finalRank = index + 1; });

    // Grand Rank = position by the total marks of all terms.
    [...rows]
      .sort((a, b) => (b.grandTotal - a.grandTotal) || (b.average - a.average))
      .forEach((row, index) => { row.grandRank = index + 1; });

    return { terms, subjects, rows };
  }, [allTermsData]);

  const effectiveBands = useMemo(() => (
    kgOnly && Array.isArray(gradeBands) && gradeBands.length ? gradeBands : DEFAULT_GRADE_BANDS
  ), [kgOnly, gradeBands]);

  const positionMode = kgOnly ? (rankDisplayOverride || 'grade') : 'rank';
  const showGradeColumn = positionMode === 'rank';

  const calculateGrade = (marks) => {
    if (kgOnly) return gradeForMark(marks, effectiveBands);
    if (marks >= 90) return 'A+';
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B+';
    if (marks >= 60) return 'B';
    if (marks >= 50) return 'C';
    if (marks >= 40) return 'D';
    return 'F';
  };

  const positionText = (rank, grade) => {
    if (positionMode === 'grade') return grade || '-';
    if (positionMode === 'both') return `${rank} (${grade || '-'})`;
    return rank;
  };

  const effectivePassMark = (() => {
    if (kgOnly && passMarkOverride !== null && passMarkOverride !== undefined && passMarkOverride !== '') {
      const n = Number(passMarkOverride);
      if (Number.isFinite(n)) return n;
    }
    if (!kgOnly && Number.isFinite(Number(passMark))) return Number(passMark);
    const fromConfig = Number(markConfig?.pass_threshold);
    return Number.isFinite(fromConfig) ? fromConfig : 50;
  })();

  const statusForTotal = (total) => {
    if (!kgOnly) return null;
    const n = Number(total);
    return Number.isFinite(n) && n >= effectivePassMark ? 'Pass' : 'Fail';
  };

  const overallStatusFor = (student) => {
    if (!kgOnly) return student.overallStatus || 'N/A';
    const subjects = Object.values(student.subjects || {});
    if (!subjects.length) return student.overallStatus || 'Fail';
    return subjects.every(s => Number(s.total) >= effectivePassMark) ? 'Pass' : 'Fail';
  };

  const saveClassPassMark = async () => {
    const value = Number(passMarkInput);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      window.alert('Pass mark must be a number between 0 and 100.');
      return;
    }
    try {
      setPassMarkSaving(true);
      const res = await axios.put(`${API_BASE_URL}/mark-list/pass-mark`, {
        className: selectedClass,
        termNumber: Number(selectedTerm),
        passMark: value,
        ...(viewMode === 'subject' && selectedSubject ? { subjectName: selectedSubject } : {}),
      });
      const saved = Number(res.data?.passMark);
      const finalValue = Number.isFinite(saved) ? saved : value;
      setPassMark(finalValue);
      setPassMarkInput(String(finalValue));
      setPassMarkVersion(v => v + 1);
    } catch (err) {
      window.alert(err.response?.data?.error || 'Could not save the pass mark.');
    } finally {
      setPassMarkSaving(false);
    }
  };

  const getGradeColor = (grade) => {
    if (grade === 'A+' || grade === 'A') return '#27ae60';
    if (grade === 'B+' || grade === 'B') return '#f39c12';
    if (grade === 'C') return '#e67e22';
    return '#e74c3c';
  };

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    return student.student_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => (b.total || 0) - (a.total || 0));

  // Statistics for subject view
  const totalStudents = filteredStudents.length;
  const marks = filteredStudents.map((s) => s.total || 0);
  const averageMark = marks.length > 0 ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : 0;
  const passCount = kgOnly
    ? filteredStudents.filter((s) => statusForTotal(s.total || 0) === 'Pass').length
    : filteredStudents.filter((s) => s.pass_status === 'Pass').length;
  const failCount = totalStudents - passCount;

  // Get mark components from config
  const markComponents = markConfig?.mark_components || [];

  // Get all subjects from ranking data
  const allSubjects = rankingData?.subjects || [];

  const classOptions = useMemo(
    () => (classes || []).map((cls) => {
      const val = typeof cls === 'object' && cls !== null ? (cls.class_name || cls.name || cls.id) : cls;
      const lbl = typeof cls === 'object' && cls !== null ? (cls.class_name || cls.name || cls.label || val) : String(cls).toUpperCase();
      return { value: val, label: lbl };
    }),
    [classes]
  );

  const subjectOptions = useMemo(
    () =>
      subjects.map((sub) => ({
        value: sub.subject_name,
        label: sub.subject_name
      })),
    [subjects]
  );

  const termOptions = useMemo(
    () => [
      ...Array.from({ length: termCount }, (_, i) => ({
        value: String(i + 1),
        label: t('academic.markLists.term', 'Term {{n}}', { n: i + 1 })
      })),
      { value: 'all', label: 'All Terms' },
    ],
    [termCount, t]
  );

  const exportToExcel = () => {
    if (selectedTerm === 'all') {
      const terms = allTermsSummary?.terms || [];
      const subjects = allTermsSummary?.subjects || [];
      const rows = allTermRows.map((row) => {
        const out = { 'Final Rank': row.finalRank, 'Student Name': row.studentName };
        terms.forEach((term) => {
          const t = row.perTerm[term.termNumber];
          subjects.forEach((subject) => {
            const sd = t?.subjects?.[subject];
            out[`T${term.termNumber} ${subject}`] = sd !== undefined && sd !== null
              ? (Number(sd.total) || 0)
              : '';
          });
          out[`T${term.termNumber} Total`] = t ? Number(t.total).toFixed(0) : '';
          out[`T${term.termNumber} Average`] = t ? Number(t.average).toFixed(1) : '';
          out[`T${term.termNumber} Rank`] = t?.rank ?? '';
        });
        out['Grand Total'] = Number(row.grandTotal).toFixed(0);
        out['Grand Average'] = Number(row.average).toFixed(1);
        out['Grand Rank'] = row.grandRank;
        out['Status'] = row.status;
        return out;
      });
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'All Terms');
      XLSX.writeFile(workbook, `${selectedClass}_All_Terms_Rankings.xlsx`);
      return;
    }

    if (viewMode === 'subject') {
      const worksheet = XLSX.utils.json_to_sheet(
        sortedStudents.map((student, index) => {
          const row = { Rank: index + 1, 'Student Name': student.student_name };
          markComponents.forEach((comp) => {
            const key = comp.name.toLowerCase().replace(/\s+/g, '_');
            row[comp.name] = student[key] || 0;
          });
          row['Total'] = student.total || 0;
          row['Grade'] = calculateGrade(student.total || 0);
          row['Status'] = kgOnly ? statusForTotal(student.total || 0) : (student.pass_status || 'N/A');
          return row;
        })
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mark List');
      XLSX.writeFile(workbook, `${selectedClass}_${selectedSubject}_Term${selectedTerm}_Marks.xlsx`);
    } else {
      // Export ranking with all subjects
      const worksheet = XLSX.utils.json_to_sheet(
        (rankingData?.rankings || []).map((student) => {
          const row = { Rank: student.rank, 'Student Name': student.studentName };
          allSubjects.forEach((subject) => {
            row[subject] = student.subjects?.[subject]?.total || '-';
          });
          row['Total'] = student.totalMarks?.toFixed(1) || 0;
          row['Average'] = student.average?.toFixed(1) || 0;
          row['Grade'] = calculateGrade(student.average || 0);
          row['Status'] = kgOnly ? overallStatusFor(student) : (student.overallStatus || 'N/A');
          return row;
        })
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Ranking');
      XLSX.writeFile(workbook, `${selectedClass}_Term${selectedTerm}_AllSubjects_Rankings.xlsx`);
    }
  };

  const exportToPDF = () => {
    const input = markListRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const filename =
        viewMode === 'subject'
          ? `${selectedClass}_${selectedSubject}_Term${selectedTerm}_Marks.pdf`
          : `${selectedClass}_Term${selectedTerm}_AllSubjects_Rankings.pdf`;
      pdf.save(filename);
    });
  };

  const printMarkList = () => window.print();

  const isAllTerms = selectedTerm === 'all';
  const allTermRows = allTermsSummary?.rows || [];
  const studentCount = isAllTerms
    ? allTermRows.length
    : viewMode === 'subject' ? totalStudents : rankingData?.rankings?.length || 0;
  const subjectCount = isAllTerms
    ? (allTermsData?.allSubjects?.length || 0)
    : viewMode === 'subject' ? subjects.length : allSubjects.length;
  const avgDisplay = isAllTerms
    ? (allTermRows.length
        ? (allTermRows.reduce((s, r) => s + (Number(r.average) || 0), 0) / allTermRows.length).toFixed(1)
        : '0.0')
    : viewMode === 'subject'
      ? averageMark
      : rankingData?.summary?.averageClassScore?.toFixed(1) || 0;
  const passedCount = isAllTerms
    ? allTermRows.filter((r) => r.status === 'Pass').length
    : viewMode === 'subject'
      ? passCount
      : rankingData?.rankings?.filter((r) => (
          kgOnly ? overallStatusFor(r) === 'Pass' : r.overallStatus === 'Pass'
        )).length || 0;
  const exportDisabled = isAllTerms
    ? allTermRows.length === 0
    : (viewMode === 'subject' && sortedStudents.length === 0) ||
      (viewMode === 'ranking' && !rankingData?.rankings?.length);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={32} />
        <p>{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{kgOnly ? 'KG Mark List' : t('academic.markLists.title', 'Mark Lists')}</h1>
          <p className={styles.pageSubtitle}>
            {kgOnly ? 'View and enter marks for kindergarten classes only' : t('academic.markLists.subtitle', 'View and analyze student performance')}
          </p>
        </div>
        <BarChart3 size={28} className={styles.headerIcon} aria-hidden />
      </div>

      {!isAllTerms && (
        <div className={styles.viewToggle}>
          <Button
            variant={viewMode === 'ranking' ? 'primary' : 'ghost'}
            icon={<Trophy size={16} />}
            onClick={() => setViewMode('ranking')}
          >
            {t('academic.markLists.allSubjects', 'All Subjects & Ranking')}
          </Button>
          <Button
            variant={viewMode === 'subject' ? 'primary' : 'ghost'}
            icon={<BookOpen size={16} />}
            onClick={() => setViewMode('subject')}
          >
            {t('academic.markLists.singleSubject', 'Single Subject')}
          </Button>
        </div>
      )}

      <div className={styles.statsGrid}>
        <StatCard
          title={t('academic.markLists.students', 'Students')}
          value={String(studentCount)}
          icon={<Users size={20} />}
          size="small"
        />
        <StatCard
          title={t('academic.subjects', 'Subjects')}
          value={String(subjectCount)}
          icon={<BookOpen size={20} />}
          size="small"
          variant="primary"
        />
        <StatCard
          title={t('academic.markLists.classAverage', 'Class Average')}
          value={`${avgDisplay}%`}
          icon={<BarChart3 size={20} />}
          size="small"
          variant="secondary"
        />
        <StatCard
          title={t('academic.markLists.passed', 'Passed')}
          value={String(passedCount)}
          icon={<CheckCircle size={20} />}
          size="small"
          variant="success"
        />
      </div>

      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <Select
            label={t('academic.markLists.class', 'Class')}
            value={selectedClass}
            onChange={setSelectedClass}
            options={classOptions}
          />
          {!isAllTerms && viewMode === 'subject' && (
            <Select
              label={t('academic.subjects', 'Subject')}
              value={selectedSubject}
              onChange={setSelectedSubject}
              options={subjectOptions}
              disabled={subjects.length === 0}
              placeholder={t('academic.markLists.noSubjects', 'No subjects')}
            />
          )}
          <Select
            label={t('academic.markLists.termLabel', 'Term')}
            value={selectedTerm}
            onChange={setSelectedTerm}
            options={termOptions}
          />
          <Input
            label={t('common.search', 'Search')}
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('academic.markLists.searchStudents', 'Search students...')}
            prefixIcon={<Search size={16} />}
          />
        </div>
      </Card>


      {/* Mark List Table */}
      <div ref={markListRef} className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2>
            {isAllTerms
              ? `${selectedClass} - All Terms${allTermsSummary?.terms?.length ? ` (1-${allTermsSummary.terms.length})` : ''}`
              : viewMode === 'subject'
                ? `${selectedClass} - ${selectedSubject} - Term ${selectedTerm}`
                : `${selectedClass} - All Subjects - Term ${selectedTerm}`}
          </h2>
          {(viewMode === 'ranking' || isAllTerms) && allSubjects.length > 0 && (
            <span className={styles.subjectCount}>{allSubjects.length} Subjects</span>
          )}
          {selectedClass && !isAllTerms && !kgOnly && !/^KG/i.test(String(selectedClass)) ? (
            <span className={styles.passThreshold}>
              {viewMode === 'subject' ? 'Pass Mark (this subject):' : 'Pass Mark (all subjects):'}{' '}
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={passMarkInput}
                onChange={(e) => setPassMarkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveClassPassMark(); }}
                aria-label="Pass mark percent"
                style={{
                  width: 64,
                  padding: '2px 6px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  marginLeft: 4,
                }}
              />
              <span style={{ marginLeft: 2 }}>%</span>
              <button
                type="button"
                onClick={saveClassPassMark}
                disabled={passMarkSaving}
                style={{
                  marginLeft: 8,
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#6366f1',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: passMarkSaving ? 'default' : 'pointer',
                  opacity: passMarkSaving ? 0.7 : 1,
                }}
              >
                {passMarkSaving ? 'Saving…' : 'Save'}
              </button>
            </span>
          ) : selectedClass && !isAllTerms ? (
            <span className={styles.passThreshold}>Pass Mark: {effectivePassMark}%</span>
          ) : null}
          {!isAllTerms && kgOnly && positionMode !== 'rank' && effectiveBands.length > 0 && (
            <span className={styles.passThreshold}>
              {effectiveBands
                .slice()
                .sort((a, b) => Number(b.min) - Number(a.min))
                .map(b => `${b.grade} (${b.min}-${b.max})`)
                .join('  ·  ')}
            </span>
          )}
        </div>

        {isAllTerms ? (
          loadingAllTerms ? (
            <div className={styles.loadingMarks}>
              <Loader2 className={styles.spinner} size={24} />
              <p>Loading all terms...</p>
            </div>
          ) : allTermRows.length === 0 ? (
            <div className={styles.noData}>
              <Trophy className={styles.noDataIcon} size={40} />
              <h3>No marks found for any term</h3>
              <p>Enter marks for this class first.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.markTable}>
                <thead>
                  <tr>
                    <th className={styles.stickyCol} rowSpan={2}>Final Rank</th>
                    <th className={styles.stickyCol2} rowSpan={2}>Student</th>
                    {(allTermsSummary?.terms || []).map(term => (
                      <th
                        key={`t-${term.termNumber}`}
                        colSpan={(allTermsSummary?.subjects?.length || 0) + 3}
                        className={styles.subjectHeader}
                      >
                        Term {term.termNumber}
                      </th>
                    ))}
                    <th className={styles.totalCol} rowSpan={2}>Grand Total</th>
                    <th className={styles.avgCol} rowSpan={2}>Grand Average</th>
                    <th rowSpan={2} title="Rank by the total marks of all terms">Grand Rank</th>
                    <th rowSpan={2}>Status</th>
                  </tr>
                  <tr>
                    {(allTermsSummary?.terms || []).map(term => (
                      <React.Fragment key={`h-${term.termNumber}`}>
                        {(allTermsSummary?.subjects || []).map(subject => (
                          <th key={`${term.termNumber}-${subject}`}>{subject}</th>
                        ))}
                        <th>Total</th>
                        <th>Average</th>
                        <th>Rank</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allTermRows
                    .filter((row) => {
                      if (!searchQuery) return true;
                      return row.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
                    })
                    .map((row) => (
                      <tr
                        key={row.studentName}
                        className={row.status === 'Pass' ? styles.passed : styles.failed}
                      >
                        <td className={`${styles.rank} ${styles.stickyCol}`}>
                          {row.finalRank <= 3 ? (
                            <span className={`${styles.medal} ${styles[`medal${row.finalRank}`]}`}>
                              {row.finalRank}
                            </span>
                          ) : (
                            row.finalRank
                          )}
                        </td>
                        <td className={`${styles.studentName} ${styles.stickyCol2}`}>
                          {row.studentName}
                        </td>
                        {(allTermsSummary?.terms || []).map(term => {
                          const t = row.perTerm[term.termNumber];
                          return (
                            <React.Fragment key={`r-${term.termNumber}`}>
                              {(allTermsSummary?.subjects || []).map(subject => {
                                const sd = t?.subjects?.[subject];
                                const hasData = sd !== undefined && sd !== null;
                                return (
                                  <td
                                    key={`${term.termNumber}-${subject}`}
                                    className={`${styles.subjectMark} ${
                                      hasData
                                        ? sd.status === 'Pass' ? styles.subjectPass : styles.subjectFail
                                        : styles.noMark
                                    }`}
                                  >
                                    {hasData ? (Number(sd.total) || 0) : '-'}
                                  </td>
                                );
                              })}
                              <td className={styles.totalMark}>{t ? Number(t.total).toFixed(0) : '-'}</td>
                              <td>{t ? Number(t.average).toFixed(1) : '-'}</td>
                              <td>{t?.rank ?? '-'}</td>
                            </React.Fragment>
                          );
                        })}
                        <td className={styles.totalMark}>{Number(row.grandTotal).toFixed(0)}</td>
                        <td className={styles.avgMark}>
                          <span className={styles.avgBadge}>{Number(row.average).toFixed(1)}%</span>
                        </td>
                        <td title="Rank by total marks of all terms">{row.grandRank}</td>
                        <td>
                          <span className={`${styles.status} ${styles[row.status?.toLowerCase() || 'fail']}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        ) : loadingMarks ? (
          <div className={styles.loadingMarks}>
            <Loader2 className={styles.spinner} size={24} />
            <p>{t('academic.markLists.loadingMarks', 'Loading marks...')}</p>
          </div>
        ) : viewMode === 'ranking' ? (
          !rankingData?.rankings?.length ? (
            <div className={styles.noData}>
              <Trophy className={styles.noDataIcon} size={40} />
              <h3>{t('academic.markLists.noRanking', 'No ranking data')}</h3>
              <p>{t('academic.markLists.noRankingHint', 'Enter marks for this class first.')}</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.markTable}>
                <thead>
                  <tr>
                    <th className={styles.stickyCol}>
                      {kgOnly ? rankDisplayLabel(positionMode) : t('academic.markLists.rank', 'Rank')}
                    </th>
                    <th className={styles.stickyCol2}>{t('academic.markLists.student', 'Student')}</th>
                    {allSubjects.map((subject) => (
                      <th key={subject} className={styles.subjectHeader}>
                        {subject}
                      </th>
                    ))}
                    <th className={styles.totalCol}>{t('academic.markLists.total', 'Total')}</th>
                    <th className={styles.avgCol}>{t('academic.markLists.average', 'Average')}</th>
                    {showGradeColumn && <th>{t('academic.markLists.grade', 'Grade')}</th>}
                    <th>{t('academic.markLists.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                    {rankingData.rankings
                      .filter((student) => {
                        if (!searchQuery) return true;
                        return student.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
                      })
                      .map((student) => {
                        const grade = calculateGrade(student.average || 0);
                        const overallStatus = overallStatusFor(student);
                        return (
                          <tr
                            key={student.studentName}
                            className={overallStatus === 'Pass' ? styles.passed : styles.failed}
                          >
                            <td className={`${styles.rank} ${styles.stickyCol}`}>
                              {positionMode === 'rank' ? (
                                student.rank <= 3 ? (
                                  <span className={`${styles.medal} ${styles[`medal${student.rank}`]}`}>
                                    {student.rank}
                                  </span>
                                ) : (
                                  student.rank
                                )
                              ) : (
                                positionText(student.rank, grade)
                              )}
                            </td>
                            <td className={`${styles.studentName} ${styles.stickyCol2}`}>
                              {student.studentName}
                            </td>
                            {allSubjects.map((subject) => {
                              const subjectData = student.subjects?.[subject];
                              const subjectMark = subjectData?.total || 0;
                              const subjectStatus = kgOnly
                                ? statusForTotal(subjectMark)
                                : subjectData?.status;
                              const hasData = subjectData !== undefined;
                              return (
                                <td
                                  key={subject}
                                  className={`${styles.subjectMark} ${
                                    hasData
                                      ? subjectStatus === 'Pass'
                                        ? styles.subjectPass
                                        : styles.subjectFail
                                      : styles.noMark
                                  }`}
                                >
                                  {hasData ? subjectMark : '-'}
                                </td>
                              );
                            })}
                            <td className={styles.totalMark}>{student.totalMarks?.toFixed(0) || 0}</td>
                            <td className={styles.avgMark}>
                              <span
                                className={styles.avgBadge}
                                style={{
                                  background: `${getGradeColor(grade)}20`,
                                  color: getGradeColor(grade),
                                }}
                              >
                                {student.average?.toFixed(1) || 0}%
                              </span>
                            </td>
                            {showGradeColumn && (
                              <td>
                                <span
                                  className={styles.grade}
                                  style={{
                                    background: `${getGradeColor(grade)}20`,
                                    color: getGradeColor(grade),
                                  }}
                                >
                                  {grade}
                                </span>
                              </td>
                            )}
                            <td>
                              <span
                                className={`${styles.status} ${
                                  styles[overallStatus?.toLowerCase() || 'fail']
                                }`}
                              >
                                {overallStatus || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          )
        ) :
        sortedStudents.length === 0 ? (
          <div className={styles.noData}>
            <Users className={styles.noDataIcon} size={40} />
            <h3>{t('academic.markLists.noMarks', 'No marks found')}</h3>
            <p>{t('academic.markLists.noMarksHint', 'No marks for the selected subject.')}</p>
          </div>
        ) : (
          <table className={styles.markTable}>
            <thead>
              <tr>
                <th>{kgOnly ? rankDisplayLabel(positionMode) : t('academic.markLists.rank', 'Rank')}</th>
                <th>{t('academic.markLists.student', 'Student')}</th>
                {markComponents.map((comp) => (
                  <th key={comp.name}>
                    {comp.name} ({comp.percentage}%)
                  </th>
                ))}
                <th>{t('academic.markLists.total', 'Total')}</th>
                {showGradeColumn && <th>{t('academic.markLists.grade', 'Grade')}</th>}
                <th>{t('academic.markLists.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
                {sortedStudents.map((student, index) => {
                  const grade = calculateGrade(student.total || 0);
                  const rowStatus = kgOnly ? statusForTotal(student.total || 0) : student.pass_status;
                  return (
                    <tr
                      key={student.id || student.student_name}
                      className={rowStatus === 'Pass' ? styles.passed : styles.failed}
                    >
                      <td className={styles.rank}>
                        {positionMode === 'rank' ? (
                          index < 3 ? (
                            <span className={`${styles.medal} ${styles[`medal${index + 1}`]}`}>{index + 1}</span>
                          ) : (
                            index + 1
                          )
                        ) : (
                          positionText(index + 1, grade)
                        )}
                      </td>
                      <td className={styles.studentName}>{student.student_name}</td>
                      {markComponents.map((comp) => {
                        const key = comp.name.toLowerCase().replace(/\s+/g, '_');
                        return (
                          <td key={comp.name} className={styles.componentMark}>
                            {student[key] || 0}
                          </td>
                        );
                      })}
                      <td className={styles.marks}>{student.total || 0}</td>
                      {showGradeColumn && (
                        <td>
                          <span
                            className={styles.grade}
                            style={{ background: `${getGradeColor(grade)}20`, color: getGradeColor(grade) }}
                          >
                            {grade}
                          </span>
                        </td>
                      )}
                      <td>
                        <span
                          className={`${styles.status} ${styles[rowStatus?.toLowerCase() || 'fail']}`}
                        >
                          {rowStatus || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          icon={<FileSpreadsheet size={16} />}
          onClick={exportToExcel}
          disabled={exportDisabled}
        >
          {t('academic.markLists.exportExcel', 'Export Excel')}
        </Button>
        <Button
          variant="secondary"
          icon={<FileText size={16} />}
          onClick={exportToPDF}
          disabled={exportDisabled}
        >
          {t('academic.markLists.exportPdf', 'Export PDF')}
        </Button>
        <Button
          variant="primary"
          icon={<Printer size={16} />}
          onClick={printMarkList}
          disabled={exportDisabled}
        >
          {t('academic.markLists.print', 'Print')}
        </Button>
      </div>
    </div>
  );
};

export default MarkListView;
