export const scrollbarSx = {
    '&::-webkit-scrollbar': {
        width: 12,
    },
    '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'grey.400',
        borderRadius: 3,
    },
    '&::-webkit-scrollbar-thumb:hover': {
        backgroundColor: 'primary.main',
    },
} as const
