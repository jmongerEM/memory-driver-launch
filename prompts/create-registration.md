Cursor AI Instructions: Registration Form Implementation
Context: Build a new Registration page (src/routes/registration.tsx) for Memory Driver (MD Premier). This page must handle user registration and securely store data in the DynamoDB FormData table.

1. Visual Style & Layout
Strictly follow the Evon Medics branding and the provided handwritten mockup:

Header: Display a professional title: "MDpremier: The Next-Generation of Brain Training."

Sub-header: Include a section titled "EVENT DETAILS" and a clear "Registration:" label.

Styling: * Use the Primary Navy (#091F38) for headings.

Maintain a minimalist white background with high-quality typography.

Ensure the form is center-aligned and mobile-responsive, utilizing ample padding for touch targets.

2. Form Fields & Validation
Implement a form with the following fields as specified in the mockup:

Name (*): Required text input.

Email (*): Required email-validated input.

Country (*): Required dropdown or text input.

State (*): Required dropdown or text input.

Phone Number: Optional numeric/tel input.

How did you hear about us?: Textarea or text input.

Become an Ambassador: A checkbox that users can toggle.

Submit Button: Styled with the Accent Orange (#D4480D) and labeled "Register."

3. Backend Integration (SST & DynamoDB)
The form must be linked to the existing submitContactForm server function (or a new dedicated registration function) with these specific data requirements:

Hardcoded Field: Automatically include a field type: "app_user" for every submission from this page.

Table Link: Use Resource.FormData.name to ensure data is saved to the correct DynamoDB table.

Data Mapping: * Partition Key (email): Map to the user's email input.

Attributes: Include name, country, state, phone, referralSource, isAmbassador, and createdAt.

4. Routing & Interactivity
Linkage: Ensure the "Register" button on the Home page (src/routes/index.tsx) correctly routes to this page using the TanStack Router <Link to="/registration"> component.

Success State: Upon a successful backend response, display a professional confirmation message (e.g., "Registration Successful!") and redirect the user back to the home page or a designated thank-you section.

Error Handling: Provide real-time validation messages for required fields marked with (*) in the mockup.