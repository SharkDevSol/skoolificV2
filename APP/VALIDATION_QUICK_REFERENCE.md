# Client-Side Validation - Quick Reference

## Quick Start

### 1. Import What You Need

```javascript
// For validated components
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from '../COMPONENTS/ValidatedInput';

// For validation rules and schemas
import { ValidationRules, ErrorMessages, CommonSchemas } from '../utils/validation';

// For the validation hook
import { useFormValidation } from '../hooks/useFormValidation';
```

### 2. Use Validated Components (Easiest)

```javascript
<ValidatedInput
  label="Email"
  name="email"
  type="email"
  value={values.email}
  onChange={handleChange('email')}
  onBlur={handleBlur('email')}
  error={errors.email}
  touched={touched.email}
  required
/>
```

### 3. Use the Hook (Recommended)

```javascript
const { values, errors, touched, handleChange, handleBlur, validateAll } = 
  useFormValidation(
    { email: '', password: '' },
    {
      email: [
        { validator: ValidationRules.required, message: ErrorMessages.required },
        { validator: ValidationRules.email, message: ErrorMessages.email }
      ],
      password: [
        { validator: ValidationRules.required, message: ErrorMessages.required },
        { validator: ValidationRules.minLength(6), message: ErrorMessages.minLength(6) }
      ]
    }
  );

const handleSubmit = (e) => {
  e.preventDefault();
  if (validateAll()) {
    // Submit form
  }
};
```

## Common Validation Rules

| Rule | Usage | Example |
|------|-------|---------|
| Required | `ValidationRules.required(value)` | Any field that must be filled |
| Email | `ValidationRules.email(value)` | Email addresses |
| Phone | `ValidationRules.phone(value)` | Ethiopian phone numbers |
| Min Length | `ValidationRules.minLength(n)(value)` | Passwords, usernames |
| Max Length | `ValidationRules.maxLength(n)(value)` | Text fields with limits |
| Numeric | `ValidationRules.numeric(value)` | Any number input |
| Positive | `ValidationRules.positive(value)` | Amounts, quantities |
| Range | `ValidationRules.range(min, max)(value)` | Grades (0-100) |
| Password | `ValidationRules.password(value)` | Strong passwords |
| Grade | `ValidationRules.grade(value)` | Student grades (0-100) |

## Common Schemas (Copy & Paste)

### Login Form
```javascript
const schema = CommonSchemas.login;
// Includes: branchCode, username, password
```

### Student Form
```javascript
const schema = CommonSchemas.student;
// Includes: name, email, phone, dateOfBirth
```

### Payment Form
```javascript
const schema = CommonSchemas.payment;
// Includes: amount, paymentMethod, reference
```

### Exam Form
```javascript
const schema = CommonSchemas.exam;
// Includes: title, subject, class, totalMarks
```

## Complete Form Example

```javascript
import React from 'react';
import { useFormValidation } from '../hooks/useFormValidation';
import { CommonSchemas } from '../utils/validation';
import { ValidatedInput } from '../COMPONENTS/ValidatedInput';

const MyForm = () => {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset
  } = useFormValidation(
    { username: '', password: '' },
    CommonSchemas.login
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateAll()) {
      console.log('Form is valid:', values);
      // Submit to API
      reset(); // Clear form after submit
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ValidatedInput
        label="Username"
        name="username"
        value={values.username}
        onChange={handleChange('username')}
        onBlur={handleBlur('username')}
        error={errors.username}
        touched={touched.username}
        required
      />
      
      <ValidatedInput
        label="Password"
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange('password')}
        onBlur={handleBlur('password')}
        error={errors.password}
        touched={touched.password}
        required
      />
      
      <button type="submit">Submit</button>
    </form>
  );
};
```

## Custom Validation Rule

```javascript
const schema = {
  age: [
    { validator: ValidationRules.required, message: ErrorMessages.required },
    { 
      validator: ValidationRules.range(5, 18), 
      message: 'Student must be between 5 and 18 years old' 
    }
  ]
};
```

## Sanitize User Input (XSS Protection)

```javascript
import { sanitizeInput } from '../utils/validation';

const handleSubmit = (values) => {
  const sanitized = {
    name: sanitizeInput(values.name),
    description: sanitizeInput(values.description)
  };
  // Submit sanitized values
};
```

## Checklist for Adding Validation

- [ ] Import validation utilities
- [ ] Define validation schema
- [ ] Use validated components or add error display
- [ ] Add onChange and onBlur handlers
- [ ] Validate on submit
- [ ] Show error messages
- [ ] Add required field indicators (*)
- [ ] Test with empty, invalid, and valid data
- [ ] Check accessibility (screen reader)

## Need Help?

See full documentation: `APP/src/utils/VALIDATION_GUIDE.md`

---

**Quick Tip:** Start with `CommonSchemas` for standard forms, then customize as needed!
