export function sortByFinalScore(recommendations) {
    return [...recommendations].sort((left, right) => right.finalScore - left.finalScore);
}
//# sourceMappingURL=score-sorter.js.map