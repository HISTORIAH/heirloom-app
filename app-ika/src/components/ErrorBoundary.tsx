import { Component, type ReactNode } from "react";
import { Box, Heading, Text, Button } from "@chakra-ui/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <Box minH="100vh" bg="background" display="flex" alignItems="center" justifyContent="center" p={6}>
            <Box maxW="lg" w="full" borderWidth="2px" borderColor="foreground" borderRadius="xl" p={6} bg="secondary">
              <Heading as="h1" fontSize="2xl" fontWeight="900" color="red.500" mb={4}>
                Something went wrong
              </Heading>
              <Text fontSize="sm" fontFamily="mono" wordBreak="break-all" color="muted-foreground" mb={4}>
                {this.state.error?.message ?? "Unknown error"}
              </Text>
              <Button
                onClick={() => window.location.reload()}
                borderWidth="2px"
                borderColor="foreground"
                bg="accent.lime"
                px={4}
                py={2}
                fontWeight="700"
                borderRadius="lg"
                _hover={{ boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
                transition="box-shadow 150ms"
              >
                Reload page
              </Button>
            </Box>
          </Box>
        )
      );
    }
    return this.props.children;
  }
}
