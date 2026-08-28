# UI Component Specification

## Header
Full-width government-style navigation. BIS identity, primary navigation, language, search, responsive menu, keyboard support.

## SearchBox
Primary service entry point. Large input, accessible label, submit action, examples, validation, loading state.

## StandardCard
Show standard number, title, concise relevance explanation, evidence indicator, action. Never invent confidence percentages.

## EvidencePanel
Show claim/question, source standard, section/clause/page when available, supporting text, source action. Distinguish source text from AI explanation.

## ClarificationQuestion
Question, optional rationale, concrete choices, optional free text, continue.

## ServiceCard
Use for Find Applicable Standards, Certification Information, Testing Requirements, Compare Standards.

## EmptyState
Explain what happened, why it matters, and what the user can do next.

## ErrorState
Distinguish API failure, retrieval failure, AI unavailable, source unavailable, validation error.

## LoadingState
Use meaningful stages only when known. Never fake progress.

## Footer
Institutional and quiet. Never visually dominate the service.
