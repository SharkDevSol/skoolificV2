const fs = require('fs');
let content = fs.readFileSync('APP/src/PAGE/MarkListView/MarkListView.jsx', 'utf8');

content = content.replace(/\r\n/g, '\n');

const target1 = `        const tc = parseInt(configRes.data?.term_count || configRes.data?.terms, 10) || 2;
        setTermCount(tc);
        if (classesRes.data?.length > 0) {
          setSelectedClass(classesRes.data[0]);
        }`;

const replacement1 = `        const tc = parseInt(configRes.data?.term_count || configRes.data?.terms, 10) || 2;
        setTermCount(tc);
        const rawClasses = classesRes.data;
        const classList = Array.isArray(rawClasses) ? rawClasses : (rawClasses?.classes || []);
        setClasses(classList);
        if (classList.length > 0) {
          const firstVal = typeof classList[0] === 'object' && classList[0] !== null
            ? (classList[0].class_name || classList[0].name || classList[0].id)
            : classList[0];
          setSelectedClass(firstVal);
        }`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log('Target 1 replaced successfully');
} else {
  console.log('Target 1 NOT found');
}

const target2 = `  const classOptions = useMemo(
    () => classes.map((cls) => ({ value: cls, label: cls })),
    [classes]
  );`;

const replacement2 = `  const classOptions = useMemo(
    () => (classes || []).map((cls) => {
      const val = typeof cls === 'object' && cls !== null ? (cls.class_name || cls.name || cls.id) : cls;
      const lbl = typeof cls === 'object' && cls !== null ? (cls.class_name || cls.name || cls.label || val) : String(cls).toUpperCase();
      return { value: val, label: lbl };
    }),
    [classes]
  );`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log('Target 2 replaced successfully');
} else {
  console.log('Target 2 NOT found');
}

const target3 = `const classSubjects = response.data?.filter((m) => m.class_name === selectedClass) || [];`;
const replacement3 = `const classSubjects = response.data?.filter((m) => String(m.class_name).toLowerCase() === String(selectedClass).toLowerCase()) || [];`;

if (content.includes(target3)) {
  content = content.replace(target3, replacement3);
  console.log('Target 3 replaced successfully');
} else {
  console.log('Target 3 NOT found');
}

fs.writeFileSync('APP/src/PAGE/MarkListView/MarkListView.jsx', content, 'utf8');
console.log('Done writing MarkListView.jsx');
