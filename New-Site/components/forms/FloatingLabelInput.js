/**
 * Text input with a label that floats above the field once it has focus or a
 * value. The site uses this pattern on both the careers form and the quote
 * form, so it lives here rather than being copied into each.
 * The effect is pure CSS, driven by Tailwind's peer variants and the
 * placeholder-shown state, which is why the placeholder is a single space.
 */

/**
 * Renders one labelled field.
 * `name` doubles as the element id, which is what ties the label to the input
 * for screen readers. The live site omits that association entirely, so its
 * fields announce as unlabelled.
 */
export default function FloatingLabelInput({
  name,
  label,
  type = 'text',
  required = false,
  autoComplete,
  inputMode,
  value,
  onChange,
  error,
}) {
  return (
    <div className="w-full h-fit">
      <div className="w-full relative">
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          value={value}
          onChange={onChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          /*
           * The single space placeholder is load bearing. Tailwind's
           * peer-placeholder-shown variant is what holds the label in the
           * centre of an empty field, and an empty string does not trigger it.
           */
          placeholder=" "
          className={`border focus:border-[#214F7A] block rounded-lg px-2.5 pb-2.5 pt-3 w-full bg-white text-[#5C5F69] appearance-none focus:outline-none focus:ring-0 peer ${
            error ? 'border-red-500' : 'border-black border-opacity-5'
          }`}
        />

        <label
          htmlFor={name}
          className="absolute bg-white text-sm text-[#5C5F69] text-opacity-50 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] px-2 peer-focus:px-2 peer-focus:text-[#214F7A] peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1 pointer-events-none"
        >
          {label} {required && <span className="text-[#214F7A]">*</span>}
        </label>
      </div>

      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
