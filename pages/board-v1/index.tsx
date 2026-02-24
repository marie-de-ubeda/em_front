import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: "/board-v1/overview", permanent: false } };
};

export default function BoardIndex() {
  return null;
}
