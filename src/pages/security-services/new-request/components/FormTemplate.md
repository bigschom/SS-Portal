# Form Design Guidelines

## Core Principles

1. **Consistency** - Use the same layout, field styles, colors, and spacing across all forms
2. **Simplicity** - Keep forms focused with only necessary fields
3. **Usability** - Design for ease of use on both desktop and mobile
4. **Feedback** - Provide clear validation, errors, and success messages

## Standard Layout Structure

Every form should follow this two-panel layout:

### Top Section
- Back button (top left)
- Page title and brief description

### Left Panel - Personal Information
- Photo/avatar section
- Personal info fields (name, ID, contact numbers)

### Right Panel - Form-Specific Content
- Primary action fields
- Dynamic/repeatable sections (if needed)
- Additional details section
- Form action buttons at the bottom

## UI Components

### Form Fields

#### Text Inputs
```jsx
<input
  {...register('fieldName', { required: 'Error message here' })}
  type="text"
  placeholder="Field placeholder"
  className={`w-full px-4 py-2 rounded-lg border 
            ${errors.fieldName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
            bg-white dark:bg-gray-800 dark:text-white
            focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent`}
/>
{errors.fieldName && (
  <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.fieldName.message}</p>
)}
```

#### Dropdown Selects
```jsx
<select
  {...register('fieldName')}
  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
           bg-white dark:bg-gray-800 dark:text-white
           focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
>
  <option value="">Select an option</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

#### Textarea
```jsx
<textarea
  {...register('details', { required: 'Please provide details' })}
  rows={4}
  placeholder="Placeholder text"
  className={`w-full px-4 py-2 rounded-lg border 
             ${errors.details ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}
             bg-white dark:bg-gray-800 dark:text-white
             focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent
             min-h-[100px]`}
/>
```

### Buttons

#### Primary Button (Submit)
```jsx
<button
  type="submit"
  disabled={isLoading}
  className="px-6 py-2 rounded-lg bg-black dark:bg-white 
           text-white dark:text-black
           hover:bg-gray-800 dark:hover:bg-gray-200 
           transition-colors duration-200
           disabled:opacity-50 disabled:cursor-not-allowed
           flex items-center space-x-2"
>
  {isLoading ? (
    <>
      <motion.div
        className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <span>Processing...</span>
    </>
  ) : (
    <>
      <Save className="w-4 h-4 mr-2" />
      <span>Submit Request</span>
    </>
  )}
</button>
```

#### Secondary Button (Cancel)
```jsx
<button
  type="button"
  onClick={onBack}
  disabled={isLoading}
  className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-700
           text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700
           transition-colors duration-200
           disabled:opacity-50 disabled:cursor-not-allowed"
>
  Cancel
</button>
```

#### Add Item Button
```jsx
<button
  type="button"
  onClick={() => append({ /* default values */ })}
  className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl
           text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
           transition-colors flex items-center justify-center"
>
  <Plus className="w-5 h-5 mr-2" />
  <span>Add Another Item</span>
</button>
```

## Container Styles

### Card Container
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-6"
>
  {/* Content here */}
</motion.div>
```

### Dynamic Item Container
```jsx
<div 
  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 relative"
>
  {/* Content here */}
  
  {/* Remove button */}
  <button
    type="button"
    onClick={() => remove(index)}
    className="absolute -top-3 -right-3 p-1 bg-white dark:bg-gray-700 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
  >
    <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
  </button>
</div>
```

## Standard Validations

- **Full Name**: Required
- **ID/Passport**: Required, max 16 characters
- **Phone Numbers**: Required for primary, 10 digits, pattern: `/^\d{10}$/`
- **Dynamic Fields**: Customize based on field purpose

## Form Logic Patterns

### Reference Number Generation
```javascript
// Generate reference number
const today = new Date();
const dateStr = today.toISOString().slice(2,10).replace(/-/g,'');
const { data: lastRequest } = await supabase
  .from('service_requests')
  .select('reference_number')
  .order('created_at', { ascending: false })
  .limit(1);

const lastSeq = lastRequest?.[0] ? parseInt(lastRequest[0].reference_number.slice(-3)) : 0;
const newSeq = (lastSeq + 1).toString().padStart(3, '0');
const referenceNumber = `SR${dateStr}${newSeq}`;
```

### Alert System
```javascript
// Show success alert
const showSuccessAlert = (message) => {
  setAlertMessage(message);
  setAlertType('success');
  setShowAlert(true);
  setAlertConfirmAction(() => () => {
    setShowAlert(false);
    onBack();
  });
};

// Show error alert
const showErrorAlert = (message) => {
  setAlertMessage(message);
  setAlertType('error');
  setShowAlert(true);
  setAlertConfirmAction(null);

  // Automatically remove alert after 3 seconds
  setTimeout(() => {
    setShowAlert(false);
  }, 3000);
};
```

## Color Scheme

- **Background**: White (`bg-white`) / Dark gray (`dark:bg-gray-900`)
- **Card Background**: White (`bg-white`) / Darker gray (`dark:bg-gray-800`)
- **Text**: Dark gray (`text-gray-900`) / White (`dark:text-white`)
- **Border**: Light gray (`border-gray-200`) / Dark gray (`dark:border-gray-600`)
- **Primary Button**: Black (`bg-black`) / White (`dark:bg-white`)
- **Success Alert**: Black (`bg-black`) / White (`dark:bg-white`)
- **Error Alert**: Red (`bg-red-500`)

## Form Submission Checklist

1. Validate all required fields
2. Generate reference number
3. Create main service request
4. Insert related items if needed
5. Show success message with reference number
6. Reset form on success

## Responsive Behavior

- Use `lg:grid-cols-12` for main layout
- Use `lg:col-span-4` for left panel
- Use `lg:col-span-8` for right panel
- Use `md:grid-cols-3` (or 2) for field groups
- For mobile, fields stack vertically (`grid-cols-1`)

## Accessibility Considerations

- Provide validation error messages
- Use proper contrast for text
- Keep related labels and fields close
- Use appropriate input types (tel, email, etc.)
- Add focus styles for keyboard navigation

## Animation Guidelines

- Use subtle entrance animations for sections
- Add loading spinner for submit button
- Use AlertAction component for alert messages
- Keep animations subtle and not distracting
